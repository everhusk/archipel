const debug = require('debug')('generate');
const path = require('path');
const inquirer = require('inquirer');
const Spinner = require('clui').Spinner;
const net = require('net');
const {
  loadJSONFile,
  createArchive,
  fileExists,
  prepareTempDirectory,
  saveJSONToPath,
  isEmptyString
} = require('./utils');

const {
  generateServiceConfig,
  validateServiceConfig
} = require('./service');

const {
  generateWireguardConfig
} = require('./wireguard');

const {
  generateArchipelConfig
} = require('./archipel');

const configFile = 'archipel.json';
const tempDir = '/tmp/archipel-bootstrap';

// Get password from user
const getPasswordFromUser = () => {
  const questions = [
    {
      name: 'password',
      type: 'password',
      message: 'Choose a password to protect Archipel archive:',
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter a password.';
        }
      }
    }
  ];
  return inquirer.prompt(questions);
};

// Validate config data from archipel.json file
const validateConfigData = async configData => {
  isEmptyString(configData.name, 'Archipel Name was not set in archipel.json file.');
  isEmptyString(configData.publicIps, 'Nodes public ips were not set in archipel.json file.');
  isEmptyString(configData.service, 'Service name was not found in archipel.json file.');
  validatePublicIps(configData.publicIps);
  await validateServiceConfig(configData);
};

// Validate public ips list
const validatePublicIps = ips => {
  const externalIPAddresses = ips.split(',');
  if (externalIPAddresses.length !== 3) {
    throw Error('For now Archipel supports only 3 nodes config.');
  }
  // Check if every ip address in list is valid
  externalIPAddresses.forEach(element => {
    if (!net.isIP(element)) {
      throw Error(`Public ip list has an invalid IP address (${element}).`);
    }
  });
};

// Generate config
const generateConfig = async () => {
  try {
    // Create a spinner
    const spinner = new Spinner('Generating Archipel Config Archive...');

    // Config file checks
    await prepareTempDirectory(tempDir);

    // Check if config file was found
    if (!await fileExists(configFile)) {
      throw Error('Archipel config file was not found. Try to launch \'init\' command.');
    }

    console.log('Generating init config file...');
    const configData = await loadJSONFile(configFile);

    // Validate loaded configuration data
    await validateConfigData(configData);

    // Get archive password password from user
    const password = await getPasswordFromUser();

    // Start spinner
    spinner.start();

    // Start constructing config
    let config = {};

    const externalIPAddresses = configData.publicIps.split(',');

    // Add node number to config
    config.nodesNumber = externalIPAddresses.length;

    config = { ...config, ...await generateServiceConfig(configData, config.nodesNumber) };

    // Adding wireguard config
    config = { ...config, ...await generateWireguardConfig(externalIPAddresses) };

    // Adding Archipel config
    config = { ...config, ...await generateArchipelConfig(config.nodesNumber) };

    // Write configuration to file
    await saveJSONToPath(config, `${tempDir}/config.json`);

    // Creating configuration archive
    await createArchive(tempDir, path.join(process.cwd(), 'config.zip'), password.password);

    spinner.stop();
    console.log('Success! Archipel configuration archive was generated!');
  } catch (error) {
    debug('generateConfig()', error);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  generateConfig
};