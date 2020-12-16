var historyPlayerLength = 10;
var historyAILength = 1;

var bits = {
    undefined: '00',
    rock: '01',
    paper: '11',
    scissors: '10'
};

var networkConfig = {
    Name: 'AngularRockPaperScissors',
    HiddenWidth: ((historyPlayerLength * 2) + (historyAILength * 2)) + 5,
    InputCount: (historyPlayerLength * 2) + (historyAILength * 2),
    Layers: 5,
    LearningRate: 1.5,
    OutputCount: 2,
    TeachRepeats: 3000
};

var username = null;
var password = null;
var url = null;
var networkId = -1;

angular.module('NNFront', [])
    .controller('AuthenticationController', function ($scope, $http) {
        var authentication = this;
        authentication.success = null;

        authentication.logIn = function () {
            username = authentication.username;
            password = authentication.password;
            url = authentication.url;

            var base64Authorization = btoa(authentication.username + ':' + authentication.password);

            $http.get(authentication.url + '/network/getall', {
                headers: {
                    'Authorization': 'Basic ' + base64Authorization
                }
            }).then(
                function (response) {
                    //Check if network already exists
                    response.data.networks.forEach(network => {
                        if (networkId === -1 && network.name === networkConfig.Name && network.hiddenWidth === networkConfig.HiddenWidth && network.inputCount === networkConfig.InputCount &&
                            network.layers == networkConfig.Layers && network.learningRate === networkConfig.LearningRate && network.outputCount === networkConfig.OutputCount) {
                            networkId = network.id;
                        }
                    });
                    if (networkId === -1) {
                        //Network does not exist -> create new
                        $http.post(authentication.url + '/network/create', networkConfig, {
                            headers: {
                                'Authorization': 'Basic ' + base64Authorization
                            }
                        }).then(
                            function (response) {
                                //Network created
                                authentication.success = true;
                                networkId = response.data.network.id;
                                console.log('Network created: #' + networkId);
                            },
                            function (response) {
                                //Error
                                authentication.success = false;
                                console.log(response);
                            }
                        );
                    } else {
                        //Network exists
                        authentication.success = true;
                        console.log('Network found: #' + networkId);
                    }
                },
                function (response) {
                    //Error or invalid credentials
                    authentication.success = false;
                }
            );
        };
    })

    .controller('GameController', function ($scope, $http) {
        var game = this;

        //AI move
        game.move = undefined;

        //Move history
        var historyPlayer = [];
        for (var i = 0; i < historyPlayerLength; i++) {
            historyPlayer.push(bits.undefined);
        }
        var historyAI = [];
        for (var i = 0; i < historyAILength; i++) {
            historyAI.push(bits.undefined);
        }

        //Statistics
        game.aiWins = 0;
        game.aiLosses = 0;
        game.draws = 0;
        game.totalGames = 0;
        game.aiWinRate = 0.0;

        //Waiting for API response?
        var processing = false;
        $scope.disableField = false;

        //Rock-> paper, paper -> scissors, scissors -> rock
        var counter = function (bitsP) {
            switch (bitsP) {
                case bits.rock:
                    return bits.paper;
                case bits.paper:
                    return bits.scissors;
                case bits.scissors:
                    return bits.rock;
                default:
                    return bits.rock;
            };
        };

        //Call api for AI move
        var play = function (bitsP) {
            if (processing) {
                return;
            }
            processing = true;
            $scope.disableField = true;

            historyPlayer.push(bitsP);
            historyPlayer.shift();

            var input = '';
            historyPlayer.forEach(function (bits) {
                input += bits;
            });
            historyAI.forEach(function (bits) {
                input += bits;
            });

            $http.post(url + '/network/process', {
                NetworkId: networkId,
                Input: input
            }, {
                headers: {
                    'Authorization': 'Basic ' + btoa(username + ':' + password)
                }
            }).then(
                function (processResponse) {
                    switch (processResponse.data.output) {
                        case bits.paper:
                            game.move = 'p';
                            break;
                        case bits.scissors:
                            game.move = 's';
                            break;
                        default:
                            game.move = 'r';
                            processResponse.data.output = bits.rock;//If response = bits.undefined, treat it as rock
                            break;
                    }

                    //Update statistics
                    var win = false;
                    if (processResponse.data.output == bitsP) {
                        game.draws++;
                    } else if (processResponse.data.output == counter(bitsP)) {
                        game.aiWins++;
                        win = true;
                    } else {
                        game.aiLosses++;
                    }
                    game.totalGames++;
                    game.aiWinRate = Math.round(((game.aiWins + (0.5 * game.draws)) / game.totalGames) * 100);

                    if (!win) {
                        //AI didn't win -> teach it to play better
                        $http.post(url + '/network/teachsimple', {
                            NetworkId: networkId,
                            Input: input,
                            ExpectedOutput: counter(bitsP),
                            TeachRepeats: networkConfig.TeachRepeats
                        }, {
                            headers: {
                                'Authorization': 'Basic ' + btoa(username + ':' + password)
                            }
                        }).then(
                            function (teachResponse) {
                                //API response processed -> enable GUI
                                processing = false;
                                $scope.disableField = false;
                            },
                            function (response) {
                                //Error
                                game.move = undefined;
                                historyAI.push(bits.undefined);
                                historyAI.shift();
                                console.log(response);
                                processing = false;
                                $scope.disableField = false;
                            }
                        );
                    } else {
                        //API response processed -> enable GUI
                        processing = false;
                        $scope.disableField = false;
                    }
                },
                function (response) {
                    //Error
                    game.move = undefined;
                    historyAI.push(bits.undefined);
                    historyAI.shift();
                    console.log(response);
                    processing = false;
                    $scope.disableField = false;
                }
            );
        };

        //On click listeners
        game.rock = function () {
            play(bits.rock);
        };
        game.paper = function () {
            play(bits.paper);
        };
        game.scissors = function () {
            play(bits.scissors);
        };

        game.resetStatistics = function () {
            game.aiWins = 0;
            game.aiLosses = 0;
            game.draws = 0;
            game.totalGames = 0;
            game.aiWinRate = 0.0;
        };

        game.resetAI = function () {
            //Delete current network
            $http.post(url + '/network/delete', {
                Id: networkId
            }, {
                headers: {
                    'Authorization': 'Basic ' + btoa(username + ':' + password)
                }
            }).then(
                function (deleteResponse) {
                    console.log('Network deleted');
                    //Create a fresh network
                    $http.post(url + '/network/create', networkConfig, {
                        headers: {
                            'Authorization': 'Basic ' + btoa(username + ':' + password)
                        }
                    }).then(
                        function (response) {
                            //Network created
                            networkId = response.data.network.id;
                            console.log('Network created: #' + networkId);
                        },
                        function (response) {
                            //Error
                            console.log(response);
                        }
                    );
                },
                function (response) {
                    //Error
                    console.log(response);
                }
            );
        };
    });