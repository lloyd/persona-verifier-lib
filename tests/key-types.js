/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global describe,it,require */

/* test that all permutations of key type and length for user key and
 * IdP key are supported by the verification library */

const
should = require('should'),
BrowserID = require('../'),
IdP = require('./lib/idp.js').IdP,
Client = require('./lib/client.js'),
jwcrypto = require('jwcrypto'),
async = require('async');

// I hate this!  Algorithms should be loaded on demand without explicit
// wonky requires by the client.
require("jwcrypto/lib/algs/rs");
require("jwcrypto/lib/algs/ds");

describe('key size and type', function() {
  const keyTypes = [
    { algorithm: 'rsa', keysize: 64 },
    { algorithm: 'rsa', keysize: 128 },
    { algorithm: 'rsa', keysize: 256 },
    { algorithm: 'dsa', keysize: 128 },
    { algorithm: 'dsa', keysize: 256 }
  ];

  // a local idp with a 1s delay in serving support documents
  var browserid = new BrowserID({ insecureSSL: true});

  it('all permutations (user / IdP) should pass basic assertion verification', function(done) {
    async.each(keyTypes, function(idpkt, done) {
      var idp = new IdP(idpkt);
      idp.start(function(err) {
        should.not.exist(err);
        async.each(keyTypes, function(clientkt, done) {
          var client = new Client({
            idp: idp,
            keysize: clientkt.keysize,
            algorithm: clientkt.algorithm
          });
          client.assertion({ audience: 'http://example.com' }, function(err, assertion) {
            should.not.exist(err);
            browserid.verify(
              assertion, 'http://example.com',
              function(err, details) {
                should.not.exist(err);
                (details).should.be.type('object');
                (details.audience).should.equal('http://example.com');
                // a basic sanity on expiration date
                var now = new Date();
                (details.expires).should.be.above(now - 60).and.should.be.above(now + 120);
                (details.issuer).should.equal(idp.domain());
                (details.email).should.equal(client.email());
                done(null);
              });
          });
        }, function(err) {
          should.not.exist(err);
          idp.stop(done);
        });
      });
    }, done);
  });
});
