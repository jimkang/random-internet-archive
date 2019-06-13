var Collect = require('collect-in-channel');
var waterfall = require('async-waterfall');
var BodyMover = require('request-body-mover');
var curry = require('lodash.curry');
var pathExists = require('object-path-exists');
var callNextTick = require('call-next-tick');
var Probable = require('probable').createProbable;
var compact = require('lodash.compact');

const maxResults = 10000;
const pageSize = 100;

function randomInternetArchive(
  {
    request,
    query,
    collection,
    mediatype,
    format,
    fileExtensions,
    minimumSize = 0,
    maximumSize = undefined,
    random = Math.random,
    proxyBaseURL = 'https://archive.org',
    maxTries = 10
  },
  allDone
) {
  var probable = Probable({ random });
  var channel = {
    query,
    collection,
    mediatype,
    format,
    page: 0
  };
  var tries = 0;
  tryToGet();

  function tryToGet() {
    waterfall(
      [
        // Run this first search to find out how many results there are for this query.
        curry(searchForTotal)(channel),
        Collect({
          channel,
          properties: ['total'],
          noErrorParam: true
        }),
        // Pick a random page.
        pickRandomPosition,
        Collect({ channel, properties: ['page', 'row'], noErrorParam: true }),
        // Search for the item in that random page.
        searchIA,
        Collect({
          channel,
          properties: [[getItem, 'item']],
          noErrorParam: true
        }),
        getMetadata,
        Collect({
          channel,
          properties: ['dir', 'files', 'workable_servers'],
          noErrorParam: true
        }),
        filterFiles,
        Collect({ channel, properties: ['files'], noErrorParam: true }),
        formatResult
      ],
      decideWithResult
    );
  }

  function decideWithResult(error, result) {
    tries += 1;
    if (error && tries < maxTries) {
      //console.log('Error', error, 'Tries', tries, 'Retrying.');
      callNextTick(tryToGet);
    } else if (error) {
      allDone(error);
    } else {
      allDone(error, result);
    }
  }

  function pickRandomPosition({ total }, done) {
    if (total < 1) {
      callNextTick(done, new Error('No items found.'));
    } else {
      if (total > maxResults) {
        console.log(
          'There are',
          total,
          'results. We can only get from the first',
          maxResults
        );
        total = maxResults;
      }
      let pageTotal = Math.floor(total / pageSize);
      callNextTick(done, null, {
        page: probable.roll(pageTotal),
        row: probable.roll(pageSize)
      });
    }
  }

  // TODO: Make CollectInChannel pass the channel so we don't have to rely
  // on scope to get at it.
  function getItem(body) {
    if (pathExists(body, ['response', 'docs', channel.row])) {
      return body.response.docs[channel.row];
    }
  }

  function filterFiles({ files, item }, done) {
    var usableFiles = compact(files).filter(fileIsUsable);
    if (usableFiles.length < 1) {
      callNextTick(
        done,
        new Error(`No usable files found for ${item.identifier}.`)
      );
      return;
    }
    callNextTick(done, null, { files: usableFiles });
  }

  function fileIsUsable(file) {
    if (fileExtensions && !fileExtensions.some(fileEndsWithExtension)) {
      return false;
    }
    if (minimumSize > 0 && +file.size < minimumSize) {
      return false;
    }
    if (!isNaN(maximumSize) && +file.size > maximumSize) {
      return false;
    }
    return true;

    function fileEndsWithExtension(extension) {
      return file.name.endsWith(extension);
    }
  }

  function formatResult(
    { collection, item, dir, files, workable_servers },
    done
  ) {
    var server = probable.pickFromArray(workable_servers);
    var file = probable.pickFromArray(files);
    var url = `https://${server}${dir}/${file.name}`;
    callNextTick(done, null, {
      url,
      collection,
      title: item.title,
      size: file.size,
      format: file.format,
      detailsURL: `https://archive.org/details/${item.identifier}`
    });
  }

  function getMetadata({ item }, done) {
    var reqOpts = {
      method: 'GET',
      // Ignoring proxyBaseURL here because there's no need for proxying
      // for this endpoint.
      url: `https://archive.org/metadata/${item.identifier}`,
      json: true
    };
    request(reqOpts, BodyMover(done));
  }

  function searchForTotal({ query, collection, mediatype, format }, done) {
    var reqOpts = {
      method: 'GET',
      url:
        `${proxyBaseURL}/services/search/v1/scrape?debug=false&xvar=production&total_only=true&q=` +
        makeIAQuery({ collection, mediatype, format }, query),
      json: true
    };
    //console.log('url:', reqOpts.url);
    request(reqOpts, BodyMover(done));
  }

  function searchIA({ query, collection, mediatype, format, page }, done) {
    var reqOpts = {
      method: 'GET',
      url: createSearchURL({
        query,
        iaQueryDict: {
          collection,
          mediatype,
          format
        },
        fields: ['identifier', 'item_size', 'title'],
        rows: pageSize,
        page
      }),
      json: true
    };
    //console.log('url:', reqOpts.url);
    request(reqOpts, BodyMover(done));
  }

  function createSearchURL({ iaQueryDict, fields, rows, page, query }) {
    return (
      `${proxyBaseURL}/advancedsearch.php?q=` +
      makeIAQuery(iaQueryDict, query) +
      '&' +
      fields.map(formatField).join('&') +
      '&' +
      `rows=${rows}` +
      '&' +
      `page=${page}` +
      '&' +
      'output=json' +
      '&' +
      'callback='
    );
  }
}

function makeIAQuery(iaQueryDict, freeFormQuery) {
  var q = compact(Object.keys(iaQueryDict).map(formatParam)).join('+AND+');
  if (freeFormQuery) {
    q = encodeURIComponent(`(${freeFormQuery}) AND `) + q;
  }
  return q;

  function formatParam(key) {
    if (iaQueryDict[key]) {
      return encodeURIComponent(`${key}:(${iaQueryDict[key]})`);
    }
  }
}

function formatField(field) {
  return `fl[]=${field}`;
}

module.exports = randomInternetArchive;
