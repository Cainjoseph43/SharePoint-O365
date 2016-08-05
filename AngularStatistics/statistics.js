(function (angular, $, google, _, moment, undefined) {
    "use strict";

    angular.module("my-statistics", ["ngMaterial"]).controller("StatisticsController", statisticsController);
    function statisticsController($scope) {
        $scope.loading = true;
        /**********
         CONSTANTS
        **********/
        $scope.constant = {
            from: "From",
            to: "To",
            clear: "Clear",
            print: "Print",
            nullValue: "Not defined" // Ej angivet
        };

        /**********
           MODEL
        **********/
        $scope.data = {};
        $scope.filteredData = {};
        $scope.filters = {};
        $scope.chartHeight = 400;
        $scope.chartAreaLeftAlign = 50;

        /**********
         FUNCTIONS
        **********/
        $scope.renderCharts = function () {
            $scope.renderMyBarChart();
            $scope.renderMyPieChart();
        };
        $scope.clearFilters = function () {
            $scope.filters.fromDate = undefined;
            $scope.filters.toDate = undefined;
            $scope.filteredData = $scope.data;
            $scope.renderCharts()
        };
        $scope.applyFilters = function () {
            $scope.filteredData.events = $scope.data.events;
            if ($scope.filters.fromDate) {
                var fromDate = moment($scope.filters.fromDate).toDate();
                $scope.filteredData.events = _.filter($scope.filteredData.events, function (item) {
                    var eventDate = moment(item.StartTime).toDate();
                    return eventDate >= fromDate;
                });
            };
            if ($scope.filters.toDate) {
                var toDate = moment($scope.filters.toDate).toDate();
                $scope.filteredData.events = _.filter($scope.filteredData.events, function (item) {
                    var eventDate = moment(item.StartTime).toDate();
                    return eventDate <= toDate;
                });
            };
            $scope.renderCharts();
        };

        $scope.drawChart = function (chartElementId, chartType, dataTable, options) {
            /*
            *  Draws a chart based on the given parameters.
            */
            if (document.getElementById(chartElementId)) {
                var oldChart = document.getElementById(chartElementId);
                oldChart.parentNode.removeChild(oldChart);
            };

            $('#statistic-container').append(['<div class="statistics-chart" id=', chartElementId, '></div>'].join(''));

            var chart;
            switch (chartType.toLowerCase()) {
                case "bar":
                    chart = new google.visualization.ColumnChart(document.getElementById(chartElementId));
                    break;
                case "pie":
                    chart = new google.visualization.PieChart(document.getElementById(chartElementId));
                    break;
                default:
                    console.log("drawChart Error: Not a valid chart type.");
                    break;
            };

            chart.draw(dataTable, options);
        };

        $scope.renderMyBarChart = function () {

            // Set chart options.
            var options = {
                title: "My Bar Chart",
                height: $scope.chartHeight,
                chartArea: {
                    left: $scope.chartAreaLeftAlign
                },
                vAxis: {
                    minValue: 0
                },
                hAxis: {
                    title: "Category"
                },
                isStacked: true,
                colors: ["#3366cc", "#109618"]
            };

            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn("string", "Category");
            dataTable.addColumn("number", "Events");        

            _.chain($scope.filteredData.events).groupBy(function (item) {
                return item.Category;
            }).each(function (value, key) {
                key = key == "null" ? $scope.constant.nullValue : key;                
                dataTable.addRows([[key, value.length]]);
            });

            // Render chart.
            $scope.drawChart("my-bar-chart", "bar", dataTable, options);
        };

        $scope.renderMyPieChart = function () {
            // Set chart options.
            var options = {
                title: "My Pie Chart",
                height: $scope.chartHeight,
                chartArea: {
                    left: $scope.chartAreaLeftAlign
                },
                pieSliceText: "value"
            };
            var resultArray = [["Category", "Events"]];

            // Create chart data table.
            var groupedData = _.groupBy($scope.filteredData.events, function (item, key) {
                return item.Category;
            });
            _.each(groupedData, function (value, key) {
                key = key == "null" ? $scope.constant.nullValue : key;
                resultArray.push([key, value.length]);
            });
            var dataTable = google.visualization.arrayToDataTable(resultArray);

            // Render chart.
            $scope.drawChart("my-pie-chart", "pie", dataTable, options);
        };

        $scope.unpackSearchData = function (data) {
            /*
             *   Unpacks the returned search results into a workable collection.
             */
            var results = data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
            results = _.chain(results)
                .map(function (result) { // Removes the ".Cells.results" levels of the results[x] object.
                    return _.reduce(result.Cells.results, function (out, kvp) { // Transforms the array of search property objects into properties on the result object.
                        out[kvp.Key] = kvp.Value; return out;
                    }, {})
                }).value(); // Needed since _.chain wraps the returned objects until .value() is called.
            return results;
        };

        // 
        var getSearchResultPromise = function (query, allResults, deferred) {
            /*
             *   Recursive function to get a complete search result supporting larger than 500 rows. 
             */

            // Params used in recursion
            var allResults = allResults || [];
            var deferred = deferred || $.Deferred();

            // Search query parameters
            var webUrl = query.webUrl || _spPageContextInfo.webAbsoluteUrl;
            var queryText = query.queryText || '';
            var rowLimit = query.rowLimit || 500;
            var startrow = query.startRow || '0';
            var trimDuplicates = query.trimDuplicates || false;
            var includeAllRows = query.includeAllRows || true;
            var selectedPropertiesString = query.selectedPropertiesString || "";

            // Build rest uri
            var requestUri = [
                webUrl, "/_api/search/query?", "querytext='", queryText,
                "'&rowlimit=", rowLimit,
                "&startrow=", startrow,
                "&trimduplicates=", trimDuplicates,
                "&selectproperties='",
                query.selectedPropertiesString, "'"
            ].join('');

            getAjaxPromise(requestUri).then(function (data) {
                var relevantResults = data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
                allResults = allResults.concat(relevantResults);

                if (includeAllRows && allResults.length < data.d.query.PrimaryQueryResult.RelevantResults.TotalRows) {
                    // Start recursion
                    query.startRow = allResults.length;
                    getSearchResultPromise(query, allResults, deferred);
                } else {
                    // return results
                    data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results = allResults;
                    data.d.query.PrimaryQueryResult.RelevantResults.RowCount = allResults.length;
                    deferred.resolve(data);
                }
            });
            return deferred.promise();
        }

        $scope.getEvents = function () {
            /*
             *   Retrieves all the events (including child content types) from the current web site and its subsites.
             */
            var queryarguments = [
                "ContentTypeId:\"0x0102*\"",
            ].join(" OR ");

            var currentSiteUrl = _spPageContextInfo.webAbsoluteUrl;
            var querytext = queryarguments + " Path:" + currentSiteUrl + "*";
            var selectedproperties = "Category,StartTime,EndTime,Path,Author,ContentTypeId,ContentType,ParentLink,LastModifiedTime";

            var query = {
                "webUrl": currentSiteUrl,
                "queryText": querytext,
                "rowLimit": 500,
                "startRow": 0,
                "selectedPropertiesString": selectedproperties
            }
            return getSearchResultPromise(query);
        };

        /**********
           INIT
        **********/
        $scope.getEvents().then(function (data) {
            $scope.data.events = $scope.unpackSearchData(data); // Transform data.
            $scope.filteredData.events = $scope.data.events;
            console.log("Returned " + $scope.data.events.length + " results.");

            // Render charts.
            $scope.renderCharts();

        }, function () {
            console.log("Failed to get data.")
        });

        $scope.loading = false;
    };

    // Helper function for making a get request
    var getAjaxPromise = function (url) {
        return $.ajax({
            url: url,
            type: "GET",
            headers: { "ACCEPT": "application/json;odata=verbose", "Content-Type": "application/json;odata=verbose" }
        });
    };

    google.load("visualization", "1", { packages: ["corechart", "bar"] });
    google.setOnLoadCallback(function () {
        SP.SOD.executeOrDelayUntilScriptLoaded(function () {
            angular.bootstrap(document.body, ["my-statistics"]);
        }, "sp.js");
    });

})(angular, jQuery, google, _, moment);