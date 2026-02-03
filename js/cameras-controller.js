/**
 * Cameras Controller
 */
app.controller('CamerasController', ['$scope', 'MockBackendService', '$document', function ($scope, MockBackendService, $document) {
    $scope.isLoading = true;
    $scope.dataError = false;

    $scope.allCameras = [];
    $scope.filteredCameras = [];
    $scope.paginatedCameras = [];

    // Pagination
    $scope.currentPage = 1;
    $scope.itemsPerPage = 10;
    $scope.totalItems = 0;
    $scope.paginationLabel = "Showing 0-0 of 0";

    // Filters
    $scope.filters = {
        search: '',
        status: '',
        group: '' // This maps to Location in the data
    };

    $scope.filterOptions = {
        statuses: ['Online', 'Offline', 'Warning'],
        groups: ['Building A', 'Building B', 'Parking Lot', 'Main Entrance', 'Lobby', 'Warehouse']
    };

    // Action Menu
    $scope.activeActionMenu = null; // Stores the camera ID for the open menu
    $scope.menuPosition = { top: '0px', left: '0px' };

    $scope.init = function () {
        $scope.fetchCameras();
    };

    $scope.fetchCameras = function () {
        $scope.isLoading = true;
        MockBackendService.getCameras().then(function (cameras) {
            $scope.allCameras = cameras;
            $scope.applyFilters();
            $scope.isLoading = false;
        }, function (err) {
            console.error("Error loading cameras:", err);
            $scope.dataError = true;
            $scope.isLoading = false;
        });
    };

    $scope.applyFilters = function () {
        $scope.currentPage = 1;
        var search = $scope.filters.search.toLowerCase();

        $scope.filteredCameras = $scope.allCameras.filter(function (cam) {
            var matchesSearch = cam.name.toLowerCase().includes(search) ||
                cam.location.toLowerCase().includes(search);
            var matchesStatus = $scope.filters.status === '' || cam.status === $scope.filters.status;
            var matchesGroup = $scope.filters.group === '' || cam.location === $scope.filters.group;

            return matchesSearch && matchesStatus && matchesGroup;
        });

        $scope.totalItems = $scope.filteredCameras.length;
        $scope.updatePagination();
    };

    $scope.clearFilters = function () {
        $scope.filters = { search: '', status: '', group: '' };
        $scope.applyFilters();
    };

    $scope.updatePagination = function () {
        var start = ($scope.currentPage - 1) * $scope.itemsPerPage;
        var end = start + $scope.itemsPerPage;
        $scope.paginatedCameras = $scope.filteredCameras.slice(start, end);

        var showStart = $scope.totalItems === 0 ? 0 : start + 1;
        var showEnd = Math.min(end, $scope.totalItems);
        $scope.paginationLabel = "Showing " + showStart + "-" + showEnd + " of " + $scope.totalItems;
    };

    $scope.nextPage = function () {
        if ($scope.currentPage * $scope.itemsPerPage < $scope.totalItems) {
            $scope.currentPage++;
            $scope.updatePagination();
        }
    };

    $scope.prevPage = function () {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.updatePagination();
        }
    };

    // --- Actions ---
    $scope.openCameraDetails = function (cam) {
        $scope.$parent.activePage = 'camera-settings';
        setTimeout(function () {
            $scope.$root.$broadcast('OPEN_CAMERA_SETTINGS', cam);
        }, 50);
    };


    // Action Menu Logic
    $scope.toggleActionMenu = function ($event, camera) {
        $event.stopPropagation();

        if ($scope.activeActionMenu === camera.id) {
            $scope.activeActionMenu = null;
            return;
        }

        $scope.activeActionMenu = camera.id;

        // Calculate Position
        var btn = $event.currentTarget;
        var rect = btn.getBoundingClientRect();
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        var scrollX = window.pageXOffset || document.documentElement.scrollLeft;

        // Default to opening down-left
        var top = rect.bottom + scrollY + 5;
        var left = rect.right + scrollX - 180; // Assuming menu width ~180px

        // Determine if we should open up
        if (window.innerHeight - rect.bottom < 200) {
            top = rect.top + scrollY - 210; // Approx height
        }

        $scope.menuPosition = {
            top: top + 'px',
            left: left + 'px',
            display: 'block'
        };
    };

    $scope.closeActionMenu = function () {
        $scope.activeActionMenu = null;
    };

    // Document click to close menu
    $document.on('click', function () {
        $scope.$apply(function () {
            $scope.closeActionMenu();
        });
    });

    // Prevent menu click closing
    $scope.stopProp = function ($event) {
        $event.stopPropagation();
    };

    // Placeholder actions
    $scope.handleAction = function (action, camera) {
        console.log("Action: " + action + " on " + camera.name);
        $scope.closeActionMenu();
    };

    // --- Event Listeners ---
    $scope.$on('UPDATE_CAMERA', function (evt, updatedCam) {
        var index = $scope.allCameras.findIndex(function (c) { return c.id === updatedCam.id; });
        if (index !== -1) {
            // Update the local data
            $scope.allCameras[index] = updatedCam;
            // Re-apply filters to update the view
            $scope.applyFilters();
        }
    });

    $scope.$on('DELETE_CAMERA', function (evt, deletedCam) {
        var index = $scope.allCameras.findIndex(function (c) { return c.id === deletedCam.id; });
        if (index !== -1) {
            // Remove from local data
            $scope.allCameras.splice(index, 1);
            // Re-apply filters
            $scope.applyFilters();
        }
    });

    // Init
    $scope.init();
}]);

/**
 * Camera Settings Controller
 * Handles the Camera Details/Edit page.
 */
app.controller('CameraSettingsController', ['$scope', '$timeout', function ($scope, $timeout) {
    $scope.camera = {};
    $scope.showDeleteModal = false;

    $scope.$on('OPEN_CAMERA_SETTINGS', function (evt, cam) {
        $scope.camera = angular.copy(cam);
        $scope.showDeleteModal = false;
        // Force digest if needed, though broadcast usually triggers it
    });

    $scope.handleAction = function (action) {
        // Placeholder for real actions
        console.log(action + " " + $scope.camera.name);

        if (action === 'Delete') {
            $scope.showDeleteModal = true;
        }
    };

    $scope.confirmDelete = function () {
        $scope.$root.$broadcast('DELETE_CAMERA', $scope.camera);
        $scope.showDeleteModal = false;
        $scope.goBack();
    };

    $scope.cancelDelete = function () {
        $scope.showDeleteModal = false;
    };

    $scope.saveSettings = function () {
        console.log("Saving Settings for " + $scope.camera.name);
        $scope.$root.$broadcast('UPDATE_CAMERA', $scope.camera);
        $scope.goBack();
    };

    $scope.goBack = function () {
        $scope.$parent.activePage = 'cameras';
    };
}]);
