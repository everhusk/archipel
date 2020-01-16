const { getLeader, setLeader } = require('./chain.js');
const { getKeysFromSeed } = require('./utils');
const { polkadotStart } = require('./polkadot');
const debug = require('debug')('service');

// Orchestrate service
const orchestrateService = async (api, metrics, mnemonic, aliveTime) => {
  try {
    console.log('Orchestrating service.....');

    // Get node address from seed
    const nodeKey = getKeysFromSeed(mnemonic).address;
    console.log(`Current node key: ${nodeKey}`);

    // Get current leader from chain
    let currentLeader = await getLeader(api);
    currentLeader = currentLeader.toString();

    // If current leader is already set
    if (currentLeader !== '') {
      console.log(`Current Leader: ${currentLeader}`);
      // If you are the current leader
      if (currentLeader === nodeKey) {
        await currentLeaderAction(nodeKey, aliveTime, metrics);
      // If someone else is leader
      } else {
        await otherLeaderAction(metrics, currentLeader, aliveTime, api, mnemonic);
      }
    // Leader is not already set (first time boot)
    } else {
      console.log('There is no leader set...');
      await becomeLeader(nodeKey, api, mnemonic);
    }
  } catch (error) {
    debug('orchestrateService', error);
    console.error(error);
  }
};

// Act if other node is leader
const otherLeaderAction = async (metrics, currentLeader, aliveTime, api, mnemonic) => {
  try {
    // Get validator metrics known
    const validatorMetrics = metrics.getMetrics(currentLeader);
    // If validator already sent an Metrics Update
    if (validatorMetrics !== undefined && validatorMetrics.timestamp !== 0) {
      const nowTime = new Date().getTime();
      const lastSeenAgo = nowTime - validatorMetrics.timestamp;
      // Checking if it can be considered alive
      if (lastSeenAgo > aliveTime) {
        console.log('Leader is not alive for 1min...');
        await becomeLeader(currentLeader, api, mnemonic);
      } else {
        console.log('All is OK leader is alive...');
      }
    // If there is no metrics about validator we will set timestamp and metrics to 0
    } else {
      console.log('No info about node...');
      console.log('Adding empty info about current leader and doing nothing...');
      metrics.addMetrics(currentLeader, 0, 0);
    }
  } catch (error) {
    debug('otherLeaderAction', error);
    throw error;
  }
};

// Act if your node is leader
const currentLeaderAction = async (nodeKey, aliveTime, metrics) => {
  try {
    // The node is not isolated launching service in active mode
    if (metrics.anyOneAlive(nodeKey, aliveTime)) {
      console.log('Found someone online...');
      console.log('Launching validator node...');
      await serviceStart('polkadot', 'active');
    // The node is isolated launching service in passive mode
    } else {
      console.log('Seems that no one is online...');
      console.log('Launching sync node...');
      await serviceStart('polkadot', 'passive');
    }
  } catch (error) {
    debug('currentLeader', error);
    throw error;
  }
};

// Set leader onchain and launch service
const becomeLeader = async (nodeKey, api, mnemonic) => {
  try {
    console.log('Trying to be leader...');
    const leaderSet = await setLeader(nodeKey, api, mnemonic);

    if (leaderSet === true) {
      console.log('Leader was successfully set.');
      console.log('Launching validator node...');
      await serviceStart('polkadot', 'validate');
    } else {
      console.log('Can\'t set leader.');
      console.log('Someone is already leader...');
    }
  } catch (error) {
    debug('becomeLeader', error);
    throw error;
  }
};

// Start a service
const serviceStart = async (name, mode) => {
  try {
    // If service is Polkadot launching it
    if (name === 'polkadot') {
      await polkadotStart(mode);
    } else {
      throw Error(`Service ${name} is not supported yet.`);
    }
  } catch (error) {
    debug('serviceStart', error);
    throw error;
  }
};

module.exports = {
  orchestrateService,
  serviceStart
};