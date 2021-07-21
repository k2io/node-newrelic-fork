/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const {getTestSecret} = require('../../helpers/secrets')
const license = getTestSecret('TEST_LICENSE')

// verify the creation of streaming aggregator fails and reverts
// to span aggregator
tap.test('loading the agent with a bad version infinite tracing', {timeout: 20000}, (t) => {
  let agent = null

  process.env.NEW_RELIC_HOME = __dirname + '/..'
  process.env.NEW_RELIC_HOST = 'staging-collector.newrelic.com'
  process.env.NEW_RELIC_LICENSE_KEY = license
  process.env.NEW_RELIC_INFINITE_TRACING_TRACE_OBSERVER_HOST = 'foo'

  t.doesNotThrow(function() {
    var _version = process.version
    Object.defineProperty(process, 'version', {value: 'garbage', writable: true})
    t.equal(process.version, 'garbage', 'should have set bad version')

    var api = require('../../../index.js')
    agent = api.agent
    t.ok(agent)

    process.version = _version
  }, "malformed process.version doesn't blow up the process")
  if (!t.passing()) {
    t.comment('Bailing out early.')
    return t.end()
  }

  function shutdown() {
    t.equal(agent._state, 'started', "agent didn't error connecting to staging")
    t.deepEquals(agent.config.applications(), ['My Application'], "app name is valid")
    t.equals(agent.config.agent_enabled, true, "the agent is still enabled")
    t.same(agent.config.infinite_tracing.trace_observer, { host: '', port: ''},
      'trace observer host config is set to empty')

    agent.stop(function cb_stop(err) {
      t.notOk(err, 'should not error when stopping')
      t.equal(agent._state, 'stopped', "agent didn't error shutting down")

      t.end()
    })
  }

  agent.once('errored', shutdown)
  agent.once('started', shutdown)
})
