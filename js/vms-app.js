/**
 * NuraEye VMS - AngularJS Main Module
 */
var app = angular.module('vmsApp', []);

/**
 * Mock Backend Service
 * Simulates API calls to a backend server.
 */
app.service('MockBackendService', ['$q', '$timeout', function ($q, $timeout) {
    var self = this;

    // --- Data Generation Helpers ---
    var _locations = ['Building A', 'Building B', 'Parking Lot', 'Main Entrance', 'Lobby', 'Warehouse', 'Server Room', 'Perimeter Fence'];

    // Public method to get locations
    this.getLocations = function () {
        return _delay(200).then(function () {
            return _locations;
        });
    };
    var _alertTypes = [
        { type: 'Camera Offline', severity: 'Critical', cat: 'System' },
        { type: 'Recording Stopped', severity: 'Critical', cat: 'System' },
        { type: 'Storage Full', severity: 'Critical', cat: 'System' },
        { type: 'Intrusion Detected', severity: 'High', cat: 'Security' },
        { type: 'Motion in Restricted Area', severity: 'High', cat: 'Security' },
        { type: 'Camera Tampering', severity: 'High', cat: 'Security' },
        { type: 'High Latency', severity: 'Medium', cat: 'Performance' },
        { type: 'FPS Drop', severity: 'Medium', cat: 'Performance' },
        { type: 'Camera Reconnected', severity: 'Low', cat: 'Info' },
        { type: 'User Login', severity: 'Low', cat: 'Info' }
    ];

    function _generateCameras(count) {
        var cameras = [];
        var types = ['IP', 'PTZ', 'Fisheye'];
        for (var i = 1; i <= count; i++) {
            var isOffline = Math.random() > 0.9;
            var isWarning = !isOffline && Math.random() > 0.8;
            cameras.push({
                id: 'cam-' + i,
                name: 'Camera ' + i.toString().padStart(3, '0'),
                location: _locations[Math.floor(Math.random() * _locations.length)],
                type: types[Math.floor(Math.random() * types.length)],
                status: isOffline ? 'Offline' : (isWarning ? 'Warning' : 'Online'),
                recording: Math.random() > 0.1,
                aiEnabled: Math.random() > 0.5,
                lastSeen: isOffline ? '2 hours ago' : 'Just now',
                ip: '192.168.1.' + (100 + i)
            });
        }
        return cameras;
    }

    // Unified Camera Database
    var _cameras = _generateCameras(66);

    function generateAlerts(count) {
        var alerts = [];
        var now = Date.now();
        for (var i = 1; i <= count; i++) {
            var template = _alertTypes[Math.floor(Math.random() * _alertTypes.length)];
            var timeOffset = Math.floor(Math.random() * 48 * 60 * 60 * 1000);

            // Pick a random camera from our unified list
            var randomCam = _cameras[Math.floor(Math.random() * _cameras.length)];

            alerts.push({
                id: 1000 + i,
                type: template.type,
                severity: template.severity,
                category: template.cat,
                location: randomCam.location,
                cameraName: randomCam.name,
                cameraId: randomCam.id, // Link to ID
                timestamp: now - timeOffset,
                status: Math.random() > 0.7 ? 'Read' : 'Unread',
                description: 'Automated system alert generated due to ' + template.type.toLowerCase() + '.'
            });
        }
        return alerts;
    }

    // --- Simulated Database ---
    var _db = {
        cameras: _cameras,
        systemStatus: {
            storageUsage: 82, retentionDays: 42, cpuLoad: 45, memoryUsage: 68,
            serverStatus: 'Healthy', uptime: '15d 4h 23m'
        },
        alerts: generateAlerts(150)
    };

    // Helper to simulate network delay
    var _delay = function (ms) {
        ms = ms || 600;
        return $timeout(function () { }, ms);
    };

    // --- Dashboard Methods ---
    this.getDashboardData = function () {
        return _delay(800).then(function () {
            // Dynamic Stats Calculation
            var total = _db.cameras.length;
            var online = _db.cameras.filter(c => c.status === 'Online').length;
            var offline = _db.cameras.filter(c => c.status === 'Offline').length;
            // Warning count is implicit in total - online - offline, or explicit
            var recording = _db.cameras.filter(c => c.recording).length;

            _db.cameraSummary = { total: total, online: online, offline: offline, recording: recording };

            // Dynamic Issues List
            // Find cameras that are Offline or Warning
            var issues = _db.cameras.filter(c => c.status === 'Offline' || c.status === 'Warning')
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    location: c.location,
                    status: c.status,
                    time: c.lastSeen
                }));

            // Limit issues for dashboard widget
            _db.cameraIssues = issues.slice(0, 5);


            var cpuVariation = Math.floor(Math.random() * 10) - 5;
            var memVariation = Math.floor(Math.random() * 10) - 5;
            var liveStatus = angular.copy(_db.systemStatus);
            liveStatus.cpuLoad = Math.max(0, Math.min(100, liveStatus.cpuLoad + cpuVariation));
            liveStatus.memoryUsage = Math.max(0, Math.min(100, liveStatus.memoryUsage + memVariation));

            // Dashboard only shows recent active alerts (slice of unread)
            // EXCLUDING 'System' category because those appear in "Camera Issues"
            var recentAlerts = _db.alerts
                .filter(function (a) { return a.status === 'Unread' && a.category !== 'System'; })
                .sort(function (a, b) { return b.timestamp - a.timestamp; })
                .slice(0, 6)
                .map(function (a) {
                    return {
                        id: a.id,
                        type: a.type,
                        location: a.location,
                        severity: a.severity,
                        time: getTimeAgo(a.timestamp)
                    };
                });

            return {
                cameraSummary: _db.cameraSummary,
                systemStatus: liveStatus,
                cameraIssues: _db.cameraIssues,
                alerts: recentAlerts
            };
        });
    };

    // --- Camera Methods ---
    this.getCameras = function () {
        return _delay(600).then(function () {
            // Return persistent list
            return _db.cameras;
        });
    };

    // --- Alerts Page Methods ---
    this.getAlerts = function (filters) {
        return _delay(500).then(function () {
            var results = _db.alerts.filter(function (alert) {
                // Status Filter
                // SRS: Status options: All, Unread, Resolved, Deleted
                // Note: 'Read' is internal. 'All' usually implies Unread + Read + Resolved (minus Deleted). 
                // SRS says "Status: All / Unread / Resolved / Deleted".
                // Let's interpret 'All' as Unread + Read + Resolved.

                if (filters.status === 'Unread' && alert.status !== 'Unread') return false;
                if (filters.status === 'Resolved' && alert.status !== 'Resolved') return false;
                if (filters.status === 'Deleted' && alert.status !== 'Deleted') return false;
                // If 'All', exclude Deleted
                if (filters.status === 'All' && alert.status === 'Deleted') return false;
                // If specific status 'Read', generally not shown unless All, but SRS implementation might differ.
                // Assuming 'Read' alerts show up in 'All'.

                // Severity Filter
                if (filters.severity && filters.severity !== '' && alert.severity !== filters.severity) return false;

                // Group/Location Filter
                if (filters.location && filters.location !== '' && alert.location !== filters.location) return false;

                // Time Range Filter
                if (filters.startTime && alert.timestamp < filters.startTime) return false;
                if (filters.endTime && alert.timestamp > filters.endTime) return false;

                // Type/Search Filter (Simple implementation)
                if (filters.search) {
                    var s = filters.search.toLowerCase();
                    return alert.type.toLowerCase().includes(s) ||
                        alert.location.toLowerCase().includes(s) ||
                        alert.cameraName.toLowerCase().includes(s);
                }

                return true;
            });

            // Sorting: SRS "Unread alerts SHALL always be displayed first", then Time Newest First
            results.sort(function (a, b) {
                if (a.status === 'Unread' && b.status !== 'Unread') return -1;
                if (a.status !== 'Unread' && b.status === 'Unread') return 1;
                return b.timestamp - a.timestamp;
            });

            return results;
        });
    };

    this.acknowledgeAlert = function (id) {
        return _delay(200).then(function () {
            var alert = _db.alerts.find(function (a) { return a.id === id; });
            if (alert && alert.status === 'Unread') {
                alert.status = 'Read';
            }
            return true;
        });
    };

    this.acknowledgeAll = function () {
        return _delay(400).then(function () {
            _db.alerts.forEach(function (a) {
                if (a.status === 'Unread') a.status = 'Read';
            });
            return true;
        });
    };

    this.resolveAlert = function (id) {
        return _delay(200).then(function () {
            var alert = _db.alerts.find(function (a) { return a.id === id; });
            if (alert) alert.status = 'Resolved';
            return true;
        });
    };

    this.deleteAlert = function (id) {
        return _delay(200).then(function () {
            var alert = _db.alerts.find(function (a) { return a.id === id; });
            if (alert) alert.status = 'Deleted'; // Soft delete
            return true;
        });
    };

    // Utility: Simple "Time Ago" formatter for dashboard
    function getTimeAgo(timestamp) {
        var seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return "Just Now";
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + "m ago";
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + "h ago";
        return Math.floor(hours / 24) + "d ago";
    }

}]);

/**
 * Main Controller
 * Handles global navigation and user state.
 */
app.controller('MainController', ['$scope', function ($scope) {
    $scope.activePage = 'dashboard';

    // User Profile
    $scope.user = {
        name: 'John Doe',
        role: 'Administrator',
        initials: 'JD'
    };

    $scope.isUserDropdownOpen = false;

    $scope.navigateTo = function (page) {
        $scope.activePage = page;
        console.log("Navigating to: " + page);
    };

    $scope.toggleUserDropdown = function (event) {
        event.stopPropagation();
        $scope.isUserDropdownOpen = !$scope.isUserDropdownOpen;
    };

    // Close dropdown on click outside (using a directive is cleaner, but this works for MVP)
    document.addEventListener('click', function () {
        if ($scope.isUserDropdownOpen) {
            $scope.$apply(function () {
                $scope.isUserDropdownOpen = false;
            });
        }
    });

    // Theme Logic
    $scope.theme = 'light';

    $scope.toggleTheme = function () {
        if ($scope.theme === 'light') {
            $scope.theme = 'dark';
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            $scope.theme = 'light';
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    };
}]);
