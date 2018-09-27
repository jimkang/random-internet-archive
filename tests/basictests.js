var test = require('tape');
var assertNoError = require('assert-no-error');
var randomIA = require('../index');
var seedrandom = require('seedrandom');

var testCases = [
  {
    name: 'No results',
    opts: {
      collection: 'pulpmagazinearchive',
      mediatype: 'image',
      random: seedrandom('No results')
    },
    expectedErrorMessage: 'No items found.'
  },
  {
    name: 'Get image',
    opts: {
      collection: 'mathematicsimage',
      mediatype: 'image',
      random: seedrandom('Get image'),
      fileExtensions: ['jpg', 'jpeg'],
      minimumSize: 20000,
      maximumSize: 2000000
    },
    expectedProperties: ['url', 'collection', 'title', 'size', 'format']
  },
  {
    name: 'Get image from large pool',
    opts: {
      mediatype: 'image',
      random: seedrandom('Get image from large pool'),
      fileExtensions: ['jpg', 'jpeg', 'png'],
      minimumSize: 20000,
      maximumSize: 2000000
    },
    expectedProperties: ['url', 'title', 'size', 'format']
  },
  {
    name: 'Handle not finding any usable files',
    opts: {
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
      collection: 'mathematicsimage OR amesresearchcenterimagelibrary',
      mediatype: 'image',
      random: seedrandom('multiple collections'),
      fileExtensions: ['jpg', 'jpeg', 'png'],
      minimumSize: 20000,
      maximumSize: 5000000
    },
    expectedProperties: ['url', 'collection', 'title', 'size', 'format']
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
          error.message,
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
