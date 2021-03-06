const {
  generateSubstrateKeys,
  generateNodeIds
} = require('./substrate');

// Generate Archipel configuration
const generateArchipelConfig = async federationSize => {
  const config = {};

  // Generate keys
  const substrateKeys = await generateSubstrateKeys(federationSize);

  // Constructing SR Wallets List
  config.archipelSr25519List = substrateKeys.map(element => element.sr25519Address).join(',');

  // Constructing Ed Wallets List
  config.archipelEd25519List = substrateKeys.map(element => element.ed25519Address).join(',');

  // Generate NodesIds
  const nodeIds = await generateNodeIds('archipel', federationSize);

  // Constructing boot nodes list
  const reservedPeersList = nodeIds.reduce((listArray, currentValue, currentIndex) => {
    return listArray.concat(`/ip4/10.0.1.${currentIndex + 1}/tcp/30334/p2p/${currentValue.peerId},`);
  }, '').slice(0, -1);

  config.archipelReservedPeersList = reservedPeersList;

  // Filling Archipel Nodes configuration
  config.archipelNodes = [];
  for (let i = 0; i < federationSize; i++) {
    config.archipelNodes.push({ seed: substrateKeys[i].seed, nodeIds: nodeIds[i] });
  }

  return config;
};

module.exports = {
  generateArchipelConfig
};
