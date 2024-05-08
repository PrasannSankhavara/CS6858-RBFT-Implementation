const fs = require('fs');
const path = require('path');

// Function to read commit log from file
function readCommitLog(logFilePath) {
  try {
    const logData = fs.readFileSync(logFilePath, 'utf8');
    return logData.trim().split('\n');
  } catch (error) {
    console.error(`Error reading commit log from file: ${error.message}`);
    return [];
  }
}

// Function to parse commit log data
function parseCommitLog(logData) {
    const commits = [];
    logData.forEach(line => {
      const match = line.match(/Peer:\s*(\w+),\s*View:\s*(\d+),\s*Phase\s*(\d+):\s*(.*)/);
      if (match) {
        const [, peer, view, phase, message] = match;
        commits.push({ peer, view: parseInt(view), phase: parseInt(phase), message });
      } else {
        console.log(`Error parsing line: ${line}`);
      }
    });
    return commits;
  }
  

// Function to sort commits by (view, phase)
function sortCommits(commits) {
  return commits.sort((a, b) => {
    if (a.view !== b.view) {
      return a.view - b.view;
    } else {
      return a.phase - b.phase;
    }
  });
}

// Function to check if messages for the same (view, phase) from different servers are identical
function checkMessageEquality(commits) {
  const messageMap = new Map();
  commits.forEach(commit => {
    const key = `${commit.view}-${commit.phase}`;
    if (!messageMap.has(key)) {
      messageMap.set(key, new Set());
    }
    messageMap.get(key).add(commit.message);
  });

  messageMap.forEach((messages, key) => {
    if (messages.size > 1) {
      console.log(`Messages for (View:Phase) ${key} are not identical between servers.`);
    } else {
      console.log(`Messages for (View:Phase) ${key} are identical between servers.`);
    }
  });
}

// Main function
function main() {
  const scriptDirectory = __dirname;
  const logFilePath = path.join(scriptDirectory, 'commit_status.log');

  // Read commit log from file
  const logData = readCommitLog(logFilePath);
  if (logData.length === 0) {
    console.error('Commit log is empty or could not be read.');
    return;
  }

  // Parse commit log data
  const commits = parseCommitLog(logData);

  // Sort commits by (view, phase)
  const sortedCommits = sortCommits(commits);

  // Display sorted commits for each peer
  sortedCommits.forEach(commit => {
    console.log(`Peer: ${commit.peer}, View: ${commit.view}, Phase: ${commit.phase}: ${commit.message}`);
  });

  // Check if messages for the same (view, phase) from different servers are identical
  checkMessageEquality(sortedCommits);
}

// Run main function
main();
