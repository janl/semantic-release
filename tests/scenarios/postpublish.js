'use strict'

var path = require('path')

var efh = require('error-first-handler')
var GitHubApi = require('github')
var nixt = require('nixt')

var github = new GitHubApi({
  version: '3.0.0',
  port: 4343,
  protocol: 'http',
  host: '127.0.0.1'
})

github.authenticate({
  type: 'oauth',
  token: '***'
})

module.exports = function (test, createModule) {
  createModule({
    version: '2.0.0',
    repository: {
      type: 'git',
      url: 'http://github.com/user/repo'
    }
  }, efh()(function (name, cwd) {
    test('postpublish', function (t) {
      var base = getBase(cwd)

      t.test('publish new version to github releases', function (t) {
        t.plan(1)

        base.clone()
          .stdout(/> semantic-release post\n\nGenerating changelog from.*\nParsed/m)
          .run('npm run postpublish')
          .end(function (err) {
            t.error(err, 'nixt')
          })
      })

      t.test('publish new version (with detached HEAD) to github releases', function (t) {
        t.plan(1)

        base.clone()
          .stdout(/> semantic-release post\n\nGenerating changelog from.*\nParsed/m)
          .exec('git checkout `git rev-parse HEAD`')
          .run('npm run postpublish')
          .end(function (err) {
            t.error(err, 'nixt')
          })
      })

      t.test('correct data published', function (t) {
        t.plan(4)

        github.releases.getRelease({ owner: 'user', repo: 'repo', id: 1}, function (err, raw) {
          var res = JSON.parse(raw)
          t.error(err, 'github')
          t.is(res.tag_name, 'v2.0.0', 'version')
          t.is(res.author.login, 'user', 'user')
          t.ok(/\n\n\n#### Features\n\n\* \*\*cool:\*\*\n.*the next big thing/.test(res.body), 'body')
        })
      })
    })
  }))

  createModule({
    version: '2.0.0',
    repository: {
      type: 'git',
      url: 'http://github.com/user/repo'
    },
    release: {
      notes: path.join(__dirname, '../lib/custom-release-notes')
    }
  }, efh()(function (name, cwd) {
    test('custom-release-notes', function (t) {
      var base = getBase(cwd)

      t.test('publish new version (with custom notes) to github releases', function (t) {
        t.plan(1)

        base.clone()
          .run('npm run postpublish')
          .end(function (err) {
            t.error(err, 'nixt')
          })
      })

      t.test('custom notes published', function (t) {
        t.plan(4)

        github.releases.getRelease({ owner: 'user', repo: 'repo', id: 3}, function (err, raw) {
          var res = JSON.parse(raw)
          t.error(err, 'github')
          t.is(res.tag_name, 'v2.0.0', 'version')
          t.is(res.author.login, 'user', 'user')
          t.ok(/custom log/.test(res.body), 'body')
        })
      })
    })
  }))
}

function getBase (cwd) {
  return nixt()
    .cwd(cwd)
    .env('CI', true)
    .env('GH_URL', 'http://127.0.0.1:4343/')
    .env('GH_TOKEN', '***')
    .exec('git commit --allow-empty -m "feat(cool): the next big thing"')
    .code(0)
}
