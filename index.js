var Collect = require('collect-in-channel');
var waterfall = require('async-waterfall');
var request = require('request');
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
    collection,
    mediatype,
    fileExtensions,
    minimumSize = 0,
    maximumSize = -1,
    random = Math.random
  },
  allDone
) {
  var probable = Probable({ random });
  var channel = {
    collection,
    mediatype,
    page: 0
  };

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
      Collect({ channel, properties: [[getItem, 'item']], noErrorParam: true }),
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
    allDone
  );

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
      format: file.format
    });
  }
}

function getMetadata({ item }, done) {
  var reqOpts = {
    method: 'GET',
    url: 'https://archive.org/metadata/' + item.identifier,
    json: true
  };
  request(reqOpts, BodyMover(done));
}

function searchForTotal({ collection, mediatype }, done) {
  var reqOpts = {
    method: 'GET',
    url:
      'https://archive.org/services/search/v1/scrape?debug=false&xvar=production&total_only=true&q=' +
      makeIAQuery({ collection, mediatype }),
    json: true
  };
  //console.log('url:', reqOpts.url);
  request(reqOpts, BodyMover(done));
}

function searchIA({ collection, mediatype, page }, done) {
  var reqOpts = {
    method: 'GET',
    url: createSearchURL({
      iaQueryDict: {
        collection,
        mediatype
      },
      fields: ['identifier', 'item_size', 'title'],
      rows: pageSize,
      page
    }),
    json: true
  };
  console.log('url:', reqOpts.url);
  request(reqOpts, BodyMover(done));
}

function createSearchURL({ iaQueryDict, fields, rows, page }) {
  return (
    'https://archive.org/advancedsearch.php?q=' +
    makeIAQuery(iaQueryDict) +
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

function makeIAQuery(iaQueryDict) {
  return compact(Object.keys(iaQueryDict).map(formatParam)).join('+AND+');

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
