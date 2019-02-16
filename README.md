random-internet-archive
==================

Gets a random Internet Archive resource, in URL form with some metadata.

Installation
------------

    npm install random-internet-archive

Usage
-----

    var randomInternetArchive = require('random-internet-archive');
    var request = require('request');

    randomInternetArchive(
      {
        request,
        collection: 'mathematicsimage',
        mediatype: 'image',
        fileExtensions: ['jpg', 'jpeg'],
        minimumSize: 20000,
        maximumSize: 2000000
      },
      print
    );
    
    function print(error, result) {
      if (error) {
        console.error(error);
      } else {
        console.log(result);
      }
    }

Output:

    {
      "url": "https://ia902503.us.archive.org/16/items/mathematics_05445812/mathematics_05445812_2.jpg",
      "collection": "mathematicsimage",
      "title": "Mathematics-Image-36",
      "size": "337791",
      "format": "JPEG"
    }

The `request` opt can either be the [request](https://github.com/request/request) module or [one that conforms to that interface](https://github.com/jimkang/spotify-resolve#plug-in-your-own-request-library). For example, I use [basic-browser-request](https://github.com/jimkang/basic-browser-request/) when using this in the browser.

Tests
-----

Run tests with `make test`.

License
-------

The MIT License (MIT)

Copyright (c) 2018 Jim Kang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
