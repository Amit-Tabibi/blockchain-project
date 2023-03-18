App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,
  remainingTime:null,
  deadline:new Date("Mar 10, 2024 21:21:00").getTime(),

  init: function() {
    App.displayTimeToVote();
    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        App.render();
      });
      // instance.addedEvent({}, {
      //   fromBlock: 0,
      //   toBlock: 'latest'
      // }).watch(function(error, event) {
      //   console.log("event triggered", event)
      //   // Reload when a new candidate is added
      //   App.render();
      // });
    });
  },

  render: function() {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      App.displayVoters();

      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
          candidatesSelect.append(candidateOption);
        });
      }
      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      // Do not allow a user to vote
      if(hasVoted) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  addCandidate: function() {
  var candidateName = $('#candidateName').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.addCandidate(candidateName, { from: App.account });
    }).then(function(result) {
      // Reload the page to show the new candidate
      location.reload();
    }).catch(function(err) {
      console.error(err);
    });
},

  displayTimeToVote: function(){
    var deadline = App.deadline;
    var x = setInterval(function() {
    var currentTime = new Date().getTime();
    App.remainingTime = deadline - currentTime;
    var days = Math.floor(App.remainingTime / (1000 * 60 * 60 * 24));
    var hours = Math.floor((App.remainingTime%(1000 * 60 * 60 * 24))/(1000 * 60 * 60));
    var minutes = Math.floor((App.remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((App.remainingTime % (1000 * 60)) / 1000);
    document.getElementById("timer").innerHTML = "Remaining time to vote : " + days + "d " 
    + hours + "h " + minutes + "m " + seconds + "s ";
        if (App.remainingTime < 0) {
            $('form').hide();
            clearInterval(x);
            document.getElementById("timer").innerHTML = "Voting Period Has Ended";
            App.showWinner();
            App.rankAllCandidates();
        }
    }, 1000);
  },

  // Define a function to retrieve and display the list of voters
    displayVoters: function() {
      // Get the deployed smart contract instance
      App.contracts.Election.deployed().then(function(instance) {
        // Call the getVoters() function on the smart contract
        return instance.getVoterAddresses();
      }).then(function(voters) {
        // Display the list of voters on the website
        document.getElementById("voterslisttitle").innerHTML = "Voters Book";
        $('#voterList').html('<ul>' + voters.map(function(voter) {
          return '<li>' + voter + '</li>';
        }).join('') + '</ul>');
      }).catch(function(err) {
        console.error(err);
      });
    },


    showWinner: function() {
    var electionInstance;
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var maxVotes = 0;
      var winningCandidatename;
      // Find the candidate with the most votes
      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var name = candidate[1];
          var voteCount = candidate[2];
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winningCandidatename = name;
          }
          document.getElementById("winner").innerHTML = "Elections Final Winner";
          document.getElementById("winnerName").innerHTML = "The winner is " + winningCandidatename;
          document.getElementById("winnerVoteCount").innerHTML = "Won with " + maxVotes + " votes";
        });
      }
    }).catch(function(error) {
      console.warn(error);
    });
  },

  rankAllCandidates: function(){
    
    let candidates = [];
    var electionInstance;
    document.getElementById("sortedcandidates").innerHTML = "Candidates Rankings";
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {

      // put the candidates into array
      let promises = [];
      for (var i = 1; i <= candidatesCount; i++) {
        promises.push(electionInstance.candidates(i).then(function(candidate) {
          candidates.push({ name:candidate[1], votes: parseInt(candidate[2]) });
        }));
      }
      return Promise.all(promises);
    }).then(function() {
      // Sort candidates by vote count in descending order
      candidates.sort((a, b) => b.votes - a.votes);

      // Add sorted candidate data to table
      let table = document.getElementById("sortedcandidatesresults");
      for (let i = 0; i < candidates.length; i++) {
        let row = table.insertRow(i+1);
        let nameCell = row.insertCell(0);
        let votesCell = row.insertCell(1);
        nameCell.innerHTML = candidates[i].name;
        votesCell.innerHTML = candidates[i].votes;
      }
      document.querySelector('#sortedcandidatesresults').style.display = 'table';
    }).catch(function(error) {
      console.warn(error);
    });

  },

  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      setTimeout(function() {
        $("#content").hide();
        $("#loader").show();
        location.reload();
      }, 300); // wait for 3 seconds
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
