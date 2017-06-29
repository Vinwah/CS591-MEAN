angular.module('cs591', ['ngRoute', 'ngCookies'])
    .controller('cs591ctrl', function ($scope, $http, $cookies) {
        $scope.initApp = function ( ) {
            // Initialize variables upon loading of page
            $scope.authorized = false
            $scope.showLogin = false
            $scope.hasSearched = false
            $scope.newsChannelWSJ = true
            $scope.newsChannelCNN = true
            $scope.newsChannelDM = true
            $scope.newsChannelAJE = true
            $scope.newsChannelHP = true
            $scope.newsChannelTG = true
            // if authorized by cookie, set authorized to true, still need to be verified in back end to use get
            let authCookie = $cookies.get('authStatus')
            $scope.authorized = !!authCookie
        }
        // maping of source ID to Source name
        $scope.mapNewsName = function(id){
            if(id == 'cnn') return 'CNN';
            if(id == 'the-wall-street-journal') return "The Wall Street Journal";
            if(id == 'daily-mail') return 'The Daily Mail';
            if(id == 'al-jazeera-english') return 'Al Jazeera';
            if(id == 'the-huffington-post') return 'The Huffington Post';
            if(id == 'the-guardian-uk') return 'The Guardian UK';
            return id;

        }
        // Search with phrase and sources in DB to get sentiment (triggered by search button)
        $scope.doSearch = function(){

            //Add sources that were indicated in search to an array
            let sources = []
            if($scope.newsChannelCNN == true) sources.push('cnn');
            if($scope.newsChannelWSJ == true) sources.push('the-wall-street-journal');
            if($scope.newsChannelDM == true) sources.push('daily-mail');
            if($scope.newsChannelAJE == true) sources.push('al-jazeera-english');
            if($scope.newsChannelHP == true) sources.push('the-huffington-post');
            if($scope.newsChannelTG == true) sources.push('the-guardian-uk');

            // if no sources were used in search, interpret it as no search was done
            if (sources.length == 0){
                $scope.hasSearched = false
            }
            else{
                // set has searched to true to display the search content viewer
                $scope.hasSearched = true

                // set up request to backend
                const request = {
                    method: 'get',
                    url: 'http://localhost:3000/api/articles/' + $scope.searchPhrase,
                    params: {
                        sources: sources
                    }
                }
                // execute request
                $http(request)
                    .then(function(result){
                        //sort data from lowest to highest score (source rating)
                        result.data.sort(function(a, b) {
                            let x = a.sourceRating; let y = b.sourceRating;
                            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                        });
                        //Add result to $scope
                        $scope.sources = result.data
                    })
                    // if something went wrong, logg the user out, updating page content to login page
                    // Does this, because this will happen every time a non authorized user tries to access backend
                    .catch(function(result){
                        $http.get('/auth/logout')
                            .then(function (response) {
                                $cookies.remove("authStatus");
                                $scope.authorized = false
                            })
                    })

            }
        }
        // OAuth with twitter
        $scope.doTwitterAuth = function () {
            let openUrl = '/auth/twitter/'
            window.location.replace(openUrl)
        }
        // OAuth log out
        $scope.logout = function () {
            $http.get('/auth/logout')
                .then(function (response) {
                    $cookies.remove("authStatus");
                    $scope.authorized = false
                })
        }
    })
    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/:status', {
                    templateUrl: '',
                    controller: 'authController'
                })
                .when(':status', {
                    templateUrl: '',
                    controller: 'authController'
                })
                .otherwise({
                    redirectTo: '/'
                })
        }])
    .controller('authController', function ($scope) {
        let authStatus =  $location.search();
        console.log("auth status:", authStatus)
        console.log('In authController')
        $scope.authorized = !!authStatus

    })

