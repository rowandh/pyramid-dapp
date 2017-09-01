var ConvertLib = artifacts.require("./ConvertLib.sol");
var Pyramid = artifacts.require("./Pyramid.sol");

module.exports = function(deployer) {
  deployer.deploy(Pyramid);
};
