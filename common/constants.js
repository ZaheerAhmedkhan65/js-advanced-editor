const constants = {};

constants.DATA_DIR = "../data";
constants.DEMO_DIR = constants.DATA_DIR + "/demo";
constants.API_DIR = constants.DATA_DIR + "/api";

if (typeof module !== 'undefined') {
    module.exports = constants
}