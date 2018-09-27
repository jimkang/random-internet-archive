var Collect = require('collect-in-channel');
var waterfall = require('async-waterfall');
var request = require('request');
var BodyMover = require('request-body-mover');
var curry = require('lodash.curry');
var pathExists = require('object-path-exists');
var callNextTick = require('call-next-tick');
var Probable = require('probable').createProbable;

function randomInternetArchive({ collection, mediatype, fileExtensions, minimumSize = 0, maximumSize = -1, random = Math.random }, allDone) {
  var probable = Probable({ random });
  var channel = {
    collection,
    mediatype,
    page: 0
  };

  waterfall(
    [
      // Run this first search to find out how many results there are for this query.
      curry(searchIA)(channel),
      Collect({ channel, properties: [[getCount, 'itemCount']], noErrorParam: true }),
      // Pick a random page.
      getRandomPageNumber,
      Collect({ channel, properties: ['page'], noErrorParam: true }),
      // Search for the item in that random page.
      searchIA,
      Collect({ channel, properties: [[getItem, 'item']], noErrorParam: true }),
      getMetadata,
      Collect({ channel, properties: ['dir', 'files', 'workable_servers'], noErrorParam: true}),
      filterFiles,
      Collect({ channel, properties: ['files'], noErrorParam: true}),
      formatResult
    ],
    allDone
  );

  function getRandomPageNumber({ itemCount }, done) {
    if (itemCount < 1) {
      callNextTick(done, new Error('No items found.'));
    } else {
      callNextTick(done, null, { page: probable.roll(itemCount) });
    }
  }

  function filterFiles({ files }, done) {
    var usableFiles = files.filter(fileIsUsable);
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

  function formatResult({ collection, item, dir, files, workable_servers }, done) {
    var server = probable.pickFromArray(workable_servers);
    var file = probable.pickFromArray(files);
    var url = `https://${server}${dir}/${file.name}`;
    callNextTick(
      done,
      null,
      {
        url,
        collection,
        title: item.title,
        size: file.size,
        format: file.format
      }
    );
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

function searchIA({ collection, mediatype, page }, done) {
  var reqOpts = {
    method: 'GET',
    url: createSearchURL({
      queryParamDict: { collection, mediatype },
      fields: ['identifier', 'item_size', 'title'],
      rows: 1,
      page
    }),
    json: true
  };
  // console.log('url:', reqOpts.url);
  request(reqOpts, BodyMover(done));
}

function createSearchURL({ queryParamDict, fields, rows, page }) {
  return 'https://archive.org/advancedsearch.php?q=' +
    Object.keys(queryParamDict).map(formatParam).join('+AND+') +
    '&' +
    fields.map(formatField).join('&') +
    '&' +
    `rows=${rows}` + 
    '&' +
    `page=${page}` + 
    '&' +
    'output=json' + 
    '&' +
    'callback=';

  function formatParam(key) {
    return encodeURIComponent(`${key}:(${queryParamDict[key]})`);
  }
}

function formatField(field) {
  return `fl[]=${field}`;
}

function getCount(body) {
  if (body.response && !isNaN(body.response.numFound)) {
    return body.response.numFound;
  }
  return 0;
}

function getItem(body) {
  if (pathExists(body, ['response', 'docs', '0'])) {
    return body.response.docs[0];
  }
}


module.exports = randomInternetArchive;
