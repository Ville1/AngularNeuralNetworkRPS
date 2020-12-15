var networkConfig = {
    Name: 'AngularRockPaperScissors',
    HiddenWidth: 5,
    InputCount: 1,
    Layers: 1,
    LearningRate: 1,
    OutputCount: 1
};

angular.module('NNFront', [])
    .controller('AuthenticationController', function ($scope, $http) {
        var authentication = this;
        authentication.success = null;

        authentication.logIn = function () {
            var base64Authorization = btoa(authentication.username + ':' + authentication.password);

            $http.get(authentication.url + '/network/getall', {
                headers: {
                    'Authorization': 'Basic ' + base64Authorization
                }
            }).then(
                function (response) {
                    //Check if network already exists
                    var networkId = -1;
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

        game.rock = function () {
            console.log('R');
        };

        game.paper = function () {
            console.log('P');
        };

        game.scissors = function () {
            console.log('S');
        };
    });