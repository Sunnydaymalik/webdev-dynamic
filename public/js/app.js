// wait for page to load
$(document).ready(function() {
    $(document).foundation();
    
    // home page
    if ($('#topStreamersChart').length) {
        initTopStreamersChart();
    }
    
    if ($('#languageChart').length) {
        initLanguageChart();
    }
    
    // rankings
    if ($('#rankingsChart').length) {
        initRankingsChart();
    }
    
    // languages
    if ($('#languageStatsChart').length) {
        initLanguageStatsChart();
    }
    
    // individual streamer
    if ($('#streamerMetricsChart').length) {
        initStreamerMetricsChart();
    }
});

// top streamers bar chart
function initTopStreamersChart() {
    // use server data if available, otherwise default
    const data = window.topStreamersData || {
        labels: ['xQcOW', 'summit1g', 'Gaules', 'ESL_CSGO', 'Tfue', 'Riot Games', 'NICKMERCS', 'Alinity', 'Rubius', 'auronplay'],
        watchtime: [6196161750, 6091677300, 5644590915, 3970318140, 3671000070, 3608966530, 3246586185, 2973096615, 2947514615, 2897221615]
    };
    
    // convert to hours
    const watchtimeHours = data.watchtime.map(minutes => Math.round(minutes / 60));
    
    const ctx = document.getElementById('topStreamersChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Watch Time (hours)',
                data: watchtimeHours,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// language pie chart
function initLanguageChart() {
    const data = window.languageData || {
        labels: ['English', 'Korean', 'Russian', 'Spanish', 'French', 'Portuguese', 'German', 'Chinese', 'Turkish', 'Italian', 'Other'],
        counts: [485, 77, 74, 68, 66, 61, 49, 30, 22, 17, 51]
    };
    
    const ctx = document.getElementById('languageChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.counts,
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
                    '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
                    '#95a5a6', '#16a085', '#d35400'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// rankings chart (horizontal)
function initRankingsChart() {
    const data = window.rankingsData || {
        labels: ['xQcOW', 'summit1g', 'Gaules', 'ESL_CSGO', 'Tfue', 'Riot Games', 'NICKMERCS', 'Alinity', 'Rubius', 'auronplay', 'Tfue', 'Pokimane', 'shroud', 'Ninja', 'TSM_Myth'],
        watchtime: [6196161750, 6091677300, 5644590915, 3970318140, 3671000070, 3608966530, 3246586185, 2973096615, 2947514615, 2897221615, 2800000000, 2700000000, 2600000000, 2500000000, 2400000000]
    };
    
    const watchtimeHours = data.watchtime.map(minutes => Math.round(minutes / 60));
    
    const ctx = document.getElementById('rankingsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Watch Time (hours)',
                data: watchtimeHours,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// language stats
function initLanguageStatsChart() {
    const data = window.languageStatsData || {
        labels: ['English', 'Korean', 'Russian', 'Spanish', 'French', 'Portuguese', 'German', 'Chinese', 'Turkish', 'Italian'],
        counts: [485, 77, 74, 68, 66, 61, 49, 30, 22, 17]
    };
    
    const ctx = document.getElementById('languageStatsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Number of Streamers',
                data: data.counts,
                backgroundColor: '#9b59b6',
                borderColor: '#8e44ad',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 50
                    }
                }
            }
        }
    });
}

// streamer radar chart
function initStreamerMetricsChart() {
    // backend needs to normalize these to 0-100
    const data = window.streamerMetricsData || {
        labels: ['Watch Time', 'Stream Time', 'Followers', 'Peak Viewers', 'Avg Viewers'],
        values: [85, 70, 90, 75, 80]
    };
    
    const ctx = document.getElementById('streamerMetricsChart').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Performance Metrics (Percentile)',
                data: data.values,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}

