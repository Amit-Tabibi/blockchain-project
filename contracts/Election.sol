pragma solidity 0.4.25;

contract Election {
    // Model a Candidate
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // Store accounts that have voted
    mapping(address => bool) public voters;
    // Store Candidates
    // Fetch Candidate
    mapping(uint256 => Candidate) public candidates;
    // Store Candidates Count
    uint256 public candidatesCount;
    address[] votersAddresses;
    // voted event
    event votedEvent(uint256 indexed _candidateId);
    event addedEvent(string _name);

    constructor() public {}

    function addCandidate(string _name) public {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit addedEvent(_name);
    }

    function vote(uint256 _candidateId) public {
        // require that they haven't voted before
        require(!voters[msg.sender]);

        // require a valid candidate
        require(_candidateId > 0 && _candidateId <= candidatesCount);

        // record that voter has voted
        voters[msg.sender] = true;

        // update candidate vote Count
        candidates[_candidateId].voteCount++;

        //add voter address to the voters addresses array
        votersAddresses.push(msg.sender);

        // trigger voted event
        emit votedEvent(_candidateId);
    }

    function getVoterAddresses() public view returns (address[]) {
    return votersAddresses;
    }
}
