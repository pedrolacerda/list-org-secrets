const { Octokit } = require("@octokit/core");
const fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

var token = argv.token;
var org = argv.org;

const octokit = new Octokit({ auth: token });
let listRepos = [];
let listSecrets = [];

async function getRepoList(page){
  const response = await octokit.request("GET /orgs/{org}/repos", {
    org: org,
    type: "private",
    sort: "full_name",
    page: page
  });

  return response;
}

async function getSecretsPerRepo(page, repo){
  const response = await octokit.request("GET /repos/{owner}/{repo}/secret-scanning/alerts", {
    owner: org,
    repo: repo,
    page: page
  });
  return response;
}

const getOrgSecrets = async _ => {
  let i = 0;
  let response;

  do {
    response = await getRepoList(i);

    response.data.forEach(repo => {
      listRepos.push(repo.name);
      getSecrets(repo.name);
    });

    i++;

  } while (response.data.length !== 0)
  
  let data = JSON.stringify(listSecrets);
  fs.appendFile('secrets.json', data, (err) => {
    if(err) throw err;
    console.log("Data written to file");
  });
}

const getSecrets = async (repo) => {
  let i = 0;
  let response;
  let isCodeScanningDisabled = false;

  do {
    response = await getSecretsPerRepo(i, repo)
      .catch((err) => {
        console.log("Secret scanning is disabled on this repository.")
        isCodeScanningDisabled = true;
      });

    response.data.forEach(secret => {
      listSecrets.push(secret);
    });

    i++;

  } while (isCodeScanningDisabled || response.data.length !== 0)
}

getOrgSecrets();