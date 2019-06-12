var test = require('tape');
var assertNoError = require('assert-no-error');
var randomIA = require('../index');
var seedrandom = require('seedrandom');
var request = require('request');

var testCases = [
  {
    name: 'NASA audio',
    opts: {
      request,
      format: 'mp3',
      fileExtensions: ['mp3'],
      collection: 'nasaaudiocollection',
      mediatype: 'audio',
      maxTries: 100
    },
    expectedProperties: ['url', 'title', 'size', 'format', 'detailsURL']
  },
  {
    name: 'Free form query',
    opts: {
      request,
      query: 'nature OR animals',
      mediatype: 'image',
      random: seedrandom('nature animals'),
      fileExtensions: ['jpg', 'jpeg', 'png'],
      minimumSize: 20000,
      maximumSize: 5000000
    },
    expectedProperties: ['url', 'title', 'size', 'format', 'detailsURL']
  },
  {
    name: 'No results',
    opts: {
      request,
      collection: 'pulpmagazinearchive',
      mediatype: 'image',
      random: seedrandom('No results')
    },
    expectedErrorMessage: 'No items found.'
  },
  {
    name: 'Get image',
    opts: {
      request,
      collection: 'mathematicsimage',
      mediatype: 'image',
      random: seedrandom('Get image'),
      fileExtensions: ['jpg', 'jpeg'],
      minimumSize: 20000,
      maximumSize: 2000000
    },
    expectedProperties: [
      'url',
      'collection',
      'title',
      'size',
      'format',
      'detailsURL'
    ]
  },
  {
    name: 'Get image from large pool',
    opts: {
      request,
      mediatype: 'image',
      random: seedrandom('Get image from large pool'),
      fileExtensions: ['jpg', 'jpeg', 'png'],
      minimumSize: 20000,
      maximumSize: 2000000
    },
    expectedProperties: ['url', 'title', 'size', 'format', 'detailsURL']
  },
  {
    name: 'Handle not finding any usable files',
    opts: {
      request,
      collection: 'mathematicsimage OR amesresearchcenterimagelibrary',
      mediatype: 'image',
      random: seedrandom('Get image'),
      fileExtensions: ['jpg', 'jpeg'],
      minimumSize: 20000,
      maximumSize: 2000000
    },
    expectedErrorMessage: 'No usable files found for A-7514.'
  },
  {
    name: 'Get image from multiple collections',
    opts: {
      request,
      collection: 'mathematicsimage OR amesresearchcenterimagelibrary',
      mediatype: 'image',
      random: seedrandom('multiple collections'),
      fileExtensions: ['jpg', 'jpeg', 'png'],
      minimumSize: 20000,
      maximumSize: 5000000
    },
    expectedProperties: [
      'url',
      'collection',
      'title',
      'size',
      'format',
      'detailsURL'
    ]
  }
];

testCases.forEach(runCase);

function runCase(testCase) {
  test(testCase.name, runTest);

  function runTest(t) {
    randomIA(testCase.opts, checkResult);

    function checkResult(error, result) {
      if (testCase.expectedErrorMessage) {
        t.equal(
          error ? error.message : '',
          testCase.expectedErrorMessage,
          'Error message is correct.'
        );
      } else {
        assertNoError(t.ok, error, 'No error from method.');
        console.log(JSON.stringify(result, null, 2));
        // We can't have predetermined expected results in this test because the Internet
        // Archive returns different available servers on each call and different docs
        // for a given query.
        t.ok(
          result.url.indexOf('.us.archive.org/') !== -1,
          'There is a host in the url.'
        );
        testCase.expectedProperties.forEach(checkProp);
      }

      t.end();

      function checkProp(prop) {
        t.ok(result[prop], `${prop} exists in result.`);
      }
    }
  }
}
