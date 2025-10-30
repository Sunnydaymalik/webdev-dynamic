import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';



const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, './public');
const template = path.join(__dirname, './templates');

let app = express();
app.use(express.static(root));

const db = new sqlite3.Database('./twitch.sqlite3', sqlite3.OPEN_READONLY, (err) => {
    if (err) console.log('Error connecting to Twitch database');
    else console.log('Connected to Twitch database');
});

// Start of index
app.get('/', (req, res) => {
    // SQL queries
    let sql_top = 'SELECT Channel, Watchtime FROM Twitch ORDER BY Watchtime DESC LIMIT 6';
    let sql_total_streamers = 'SELECT COUNT(*) AS total FROM Twitch';
    let sql_total_languages = 'SELECT COUNT(DISTINCT Language) AS total FROM Twitch';
    let sql_total_watch = 'SELECT SUM(Watchtime) AS total FROM Twitch';

    // Run all queries
    db.all(sql_top, [], (err, topRows) => {
        if (err) return res.status(500).type('txt').send('SQL Error');

        db.get(sql_total_streamers, [], (err, totalStreamers) => {
            db.get(sql_total_languages, [], (err, totalLanguages) => {
                db.get(sql_total_watch, [], (err, totalWatch) => {

                    // Read template file
                    fs.readFile(path.join(template, 'index.html'), 'utf8', (err, data) => {
                        if (err) return res.status(500).send('Error reading template');

                        // Build featured streamers HTML
let featuredHTML = '';
for (let i = 0; i < topRows.length; i++) {
    const channel = encodeURIComponent(topRows[i].Channel); // encode channel name for URL
featuredHTML += `
<div class="cell">
    <div class="card">
        <a href="/streamer?channel=${encodeURIComponent(topRows[i].Channel)}">
            <img src="/img/placeholder.jpg" alt="${topRows[i].Channel}">
            <div class="card-section">
                <h4>${topRows[i].Channel}</h4>
                <p>Watchtime: ${(topRows[i].Watchtime / 60).toLocaleString(undefined, {maximumFractionDigits:1})} hrs</p>
            </div>
        </a>
    </div>
</div>`;

}


                        // Get language data for chart
                        db.all('SELECT Language, COUNT(*) as count FROM Twitch GROUP BY Language ORDER BY count DESC', [], (err, langRows) => {
                            if (err) langRows = [];

                            // Build chart data for top streamers
                            const chartLabels = topRows.map(r => r.Channel);
                            const chartWatchtime = topRows.map(r => r.Watchtime);

                            // Build chart data for languages
                            const langLabels = langRows.map(r => r.Language);
                            const langCounts = langRows.map(r => r.count);

                            // Create chart data script
                            const chartScript = `
<script>
window.topStreamersData = {
    labels: ${JSON.stringify(chartLabels)},
    watchtime: ${JSON.stringify(chartWatchtime)}
};
window.languageData = {
    labels: ${JSON.stringify(langLabels)},
    counts: ${JSON.stringify(langCounts)}
};
</script>`;

                            // Replace placeholders
                            let html = data
                                .replace('{{FEATURED_STREAMERS}}', featuredHTML)
                                .replace('{{TOTAL_STREAMERS}}', totalStreamers.total)
                                .replace('{{TOTAL_LANGUAGES}}', totalLanguages.total)
                                .replace('{{TOTAL_WATCH_TIME}}', (totalWatch.total / 60).toLocaleString(undefined, { maximumFractionDigits: 0 }));

                            // Inject chart data before </body>
                            html = html.replace('</body>', chartScript + '</body>');

                            // Send page
                            res.status(200).type('html').send(html);
                        });
                    });
                });
            });
        });
    });
});
//End of index


// Start of top watch
// Start of watchtime rankings
app.get('/rankings', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    db.all(
        `SELECT * FROM Twitch ORDER BY Watchtime DESC LIMIT ? OFFSET ?`,
        [perPage, offset],
        (err, rows) => {
            if (err) return res.status(500).send('SQL Error');

            db.get(`SELECT COUNT(*) AS count FROM Twitch`, (err, result) => {
                if (err) return res.status(500).send('SQL Error');

                const totalCount = result.count;
                const totalPages = Math.ceil(totalCount / perPage);

                // ---- Pagination window (10 buttons max) ----
                const maxButtons = 10;
                let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
                let endPage = startPage + maxButtons - 1;
                if (endPage > totalPages) {
                    endPage = totalPages;
                    startPage = Math.max(1, endPage - maxButtons + 1);
                }

                // Page buttons
                let pageButtons = '';
                for (let i = startPage; i <= endPage; i++) {
                    if (i === page) {
                        pageButtons += `<li class="current"><span>${i}</span></li>`;
                    } else {
                        pageButtons += `<li><a href="/rankings?page=${i}">${i}</a></li>`;
                    }
                }

                // Jump buttons
                const prev10 = page > 10 ? `<li><a href="/rankings?page=${page-10}">-10</a></li>` : '';
                const next10 = page + 10 <= totalPages ? `<li><a href="/rankings?page=${page+10}">+10</a></li>` : '';

                // Read template
                fs.readFile(path.join(template, 'rankings.html'), 'utf8', (err, html) => {
                    if (err) return res.status(500).send('Template Error');

                    // Build chart data for rankings
                    const chartLabels = rows.map(r => r.Channel);
                    const chartWatchtime = rows.map(r => r.Watchtime);

                    const chartScript = `
<script>
window.rankingsData = {
    labels: ${JSON.stringify(chartLabels)},
    watchtime: ${JSON.stringify(chartWatchtime)}
};
</script>`;

                    let htmlOutput = html
    .replace('{{RANKINGS_TABLE_ROWS}}', rows.map((r, idx) => `
        <tr>
            <td>${offset + idx + 1}</td>
            <td><a href="/streamer?channel=${encodeURIComponent(r.Channel)}">${r.Channel}</a></td>
            <td>${(r.Watchtime / 60).toLocaleString(undefined, {maximumFractionDigits:1})}</td>
        </tr>`).join(''))
    .replace('{{RANK_START}}', offset + 1)
    .replace('{{RANK_END}}', offset + rows.length)
    .replace('{{TOTAL_COUNT}}', totalCount)
    .replace('{{WATCHTIME_PAGE_NUMBER_BUTTONS}}', pageButtons)
    .replace('{{WATCHTIME_PREVIOUS_10_PAGE_LINK}}', prev10)
    .replace('{{WATCHTIME_NEXT_10_PAGE_LINK}}', next10)
    .replace('{{WATCHTIME_PREVIOUS_PAGE_LINK}}', page > 1 ? `<li><a href="/rankings?page=${page-1}">Prev</a></li>` : '')
    .replace('{{WATCHTIME_NEXT_PAGE_LINK}}', page < totalPages ? `<li><a href="/rankings?page=${page+1}">Next</a></li>` : '');

                    // Inject chart data
                    htmlOutput = htmlOutput.replace('</body>', chartScript + '</body>');

                    res.status(200).type('html').send(htmlOutput);
                });
            });
        }
    );
});

//End of top watch


// Start of languages
app.get('/languages', (req, res) => {
    const selectedLang = req.query.lang;
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    if (!selectedLang) {
        // --- Show ALL languages ---
        db.all(`
            SELECT Language, COUNT(*) AS streamerCount, SUM(Watchtime) AS totalWatch
            FROM Twitch
            GROUP BY Language
            ORDER BY streamerCount DESC
            LIMIT ? OFFSET ?
        `, [perPage, offset], (err, rows) => {
            if (err) return res.status(500).send('SQL Error');

            db.get(`SELECT COUNT(DISTINCT Language) AS total FROM Twitch`, (err, totalResult) => {
                if (err) return res.status(500).send('SQL Error');

                const totalLanguages = totalResult.total;
                const totalPages = Math.ceil(totalLanguages / perPage);

                // ---- Pagination window (10 buttons max) ----
                const maxButtons = 10;
                let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
                let endPage = startPage + maxButtons - 1;
                if (endPage > totalPages) {
                    endPage = totalPages;
                    startPage = Math.max(1, endPage - maxButtons + 1);
                }

                // Page buttons with “button” styling
                let paginationHTML = '<ul class="pagination">';
                for (let i = startPage; i <= endPage; i++) {
                    if (i === page) {
                        paginationHTML += `<li><span class="button primary">${i}</span></li>`;
                    } else {
                        paginationHTML += `<li><a class="button" href="/languages?page=${i}">${i}</a></li>`;
                    }
                }
                paginationHTML += '</ul>';

                const languagesGridHTML = rows.map(r => `
                    <div class="cell">
                        <div class="card">
                            <div class="card-section">
                                <h4><a href="/languages?lang=${encodeURIComponent(r.Language)}">${r.Language}</a></h4>
                                <p>Streamers: ${r.streamerCount}</p>
                                <p>Total Watch Time: ${(r.totalWatch / 60).toLocaleString(undefined, {maximumFractionDigits:1})} hrs</p>
                            </div>
                        </div>
                    </div>
                `).join('');

                fs.readFile(path.join(template, 'languages.html'), 'utf8', (err, html) => {
                    if (err) return res.status(500).send('Template Error');

                    // Build chart data for languages
                    const chartLabels = rows.map(r => r.Language);
                    const chartCounts = rows.map(r => r.streamerCount);

                    const chartScript = `
<script>
window.languageStatsData = {
    labels: ${JSON.stringify(chartLabels)},
    counts: ${JSON.stringify(chartCounts)}
};
</script>`;

                    let htmlOutput = html
                        .replace('{{LANGUAGES_GRID}}', languagesGridHTML)
                        .replace('{{LANGUAGES_PAGINATION}}', paginationHTML)
                        .replace('{{LANGUAGE_DETAIL_SECTION}}', '')
                        .replace('{{LANGUAGE_STREAMERS_SECTION}}', '')
                        .replace('{{LANGUAGE_STREAMERS_PAGINATION}}', '');

                    // Inject chart data
                    htmlOutput = htmlOutput.replace('</body>', chartScript + '</body>');

                    res.status(200).type('html').send(htmlOutput);
                });
            });
        });
        return; // stop execution here
    }

    // --- Show STREAMERS for a specific language ---
    db.get(`
        SELECT COUNT(*) AS streamerCount, SUM(Watchtime) AS totalWatch
        FROM Twitch
        WHERE Language = ?
    `, [selectedLang], (err, summary) => {
        if (err) return res.status(500).send('SQL Error');

        db.all(`
            SELECT Channel, Followers, Watchtime
            FROM Twitch
            WHERE Language = ?
            ORDER BY Watchtime DESC
            LIMIT ? OFFSET ?
        `, [selectedLang, perPage, offset], (err, streamers) => {
            if (err) return res.status(500).send('SQL Error');

            const totalStreamers = summary.streamerCount;
            const totalPages = Math.ceil(totalStreamers / perPage);

            let streamersHTML = streamers.map((r, idx) => `
                <tr>
                    <td>${offset + idx + 1}</td>
                    <td><a href="/streamer?channel=${encodeURIComponent(r.Channel)}">${r.Channel}</a></td>
                    <td>${r.Followers}</td>
                    <td>${(r.Watchtime / 60).toLocaleString(undefined, {maximumFractionDigits:1})} hrs</td>
                </tr>
            `).join('');

            let streamersPagination = '<ul class="pagination">';
            for (let i = 1; i <= totalPages; i++) {
                if (i === page) streamersPagination += `<li class="current"><span>${i}</span></li>`;
                else streamersPagination += `<li><a href="/languages?lang=${encodeURIComponent(selectedLang)}&page=${i}">${i}</a></li>`;
            }
            streamersPagination += '</ul>';

            fs.readFile(path.join(template, 'languages.html'), 'utf8', (err, html) => {
                if (err) return res.status(500).send('Template Error');

                // Build chart data for specific language
                const chartLabels = streamers.map(r => r.Channel);
                const chartWatchtime = streamers.map(r => r.Watchtime);

                const chartScript = `
<script>
window.languageStatsData = {
    labels: ${JSON.stringify(chartLabels)},
    counts: ${JSON.stringify(chartWatchtime)}
};
</script>`;

                let htmlOutput = html
                    .replace('{{LANGUAGES_GRID}}', '')
                    .replace('{{LANGUAGES_PAGINATION}}', '')
                    .replace('{{LANGUAGE_DETAIL_SECTION}}', `
                        <h3>${selectedLang} Streamers</h3>
                        <p>Total Streamers: ${totalStreamers}</p>
                        <p>Total Watch Time: ${(summary.totalWatch / 60).toLocaleString(undefined, {maximumFractionDigits:1})} hrs</p>
                    `)
                    .replace('{{LANGUAGE_STREAMERS_SECTION}}', `
                        <table class="hover stack">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Streamer</th>
                                    <th>Followers</th>
                                    <th>Watch Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${streamersHTML}
                            </tbody>
                        </table>
                    `)
                    .replace('{{LANGUAGE_STREAMERS_PAGINATION}}', `
<nav class="pagination-wrapper" role="navigation" aria-label="Pagination">
    ${streamersPagination}
</nav>
`);

                // Inject chart data
                htmlOutput = htmlOutput.replace('</body>', chartScript + '</body>');

                res.status(200).type('html').send(htmlOutput);
            });
        });
    });
});
// End of languages


//START of streamer?
// Streamer profile route
app.get('/streamer', (req, res) => {
    const channel = req.query.channel; // use Channel, not id
    if (!channel) return res.status(400).send('Channel not specified');

    // First, get all channels ordered by watchtime
    db.all('SELECT Channel FROM Twitch ORDER BY Watchtime DESC', [], (err, rows) => {
        if (err) return res.status(500).send('SQL Error');

        const channels = rows.map(r => r.Channel);
        const index = channels.indexOf(channel);

        if (index === -1) return res.status(404).send('Streamer not found');

        const prevLink = index > 0
            ? `<li><a href="/streamer?channel=${encodeURIComponent(channels[index - 1])}">Previous</a></li>`
            : '';
        const nextLink = index < channels.length - 1
            ? `<li><a href="/streamer?channel=${encodeURIComponent(channels[index + 1])}">Next</a></li>`
            : '';

        // Now get full streamer info
        db.get('SELECT * FROM Twitch WHERE Channel = ?', [channel], (err, row) => {
            if (err) return res.status(500).send('SQL Error');

            // Get max values for normalization
            db.get(`SELECT 
                MAX(Watchtime) as maxWatch,
                MAX(Streamtime) as maxStream,
                MAX(Followers) as maxFollowers,
                MAX(Peakviewers) as maxPeak,
                MAX(Averageviewers) as maxAvg
                FROM Twitch`, [], (err, maxVals) => {
                if (err) maxVals = {maxWatch: 1, maxStream: 1, maxFollowers: 1, maxPeak: 1, maxAvg: 1};

                // Normalize to 0-100
                const normalizedValues = [
                    Math.round((row.Watchtime / maxVals.maxWatch) * 100),
                    Math.round((row.Streamtime / maxVals.maxStream) * 100),
                    Math.round((row.Followers / maxVals.maxFollowers) * 100),
                    Math.round((row.Peakviewers / maxVals.maxPeak) * 100),
                    Math.round((row.Averageviewers / maxVals.maxAvg) * 100)
                ];

                const chartScript = `
<script>
window.streamerMetricsData = {
    labels: ['Watch Time', 'Stream Time', 'Followers', 'Peak Viewers', 'Avg Viewers'],
    values: ${JSON.stringify(normalizedValues)}
};
</script>`;

                fs.readFile(path.join(template, 'streamer.html'), 'utf8', (err, html) => {
                    if (err) return res.status(500).send('Template Error');

                    let htmlOutput = html
                        .replace(/{{STREAMER_NAME}}/g, row.Channel)
                        .replace(/{{STREAMER_THUMBNAIL}}/g, row.ProfileImage || '/img/placeholder.jpg')
                        .replace(/{{CHANNEL_NAME}}/g, row.Channel)
                        .replace(/{{LANGUAGE}}/g, row.Language)
                        .replace(/{{FOLLOWERS}}/g, row.Followers.toLocaleString())
                        .replace(/{{WATCH_TIME}}/g, (row.Watchtime / 60).toLocaleString(undefined, {maximumFractionDigits:1}))
                        .replace(/{{STREAM_TIME}}/g, row.Streamtime ? (row.Streamtime / 60).toLocaleString(undefined, {maximumFractionDigits:1}) : 'N/A')
                        .replace(/{{PEAK_VIEWERS}}/g, row.Peakviewers || 'N/A')
                        .replace(/{{STREAM_PREVIEW}}/g, row.PreviewImage || '/img/placeholder.jpg')
                        .replace('{{PREVIOUS_STREAMER_LINK}}', prevLink)
                        .replace('{{NEXT_STREAMER_LINK}}', nextLink);

                    // Inject chart data
                    htmlOutput = htmlOutput.replace('</body>', chartScript + '</body>');

                    res.status(200).type('html').send(htmlOutput);
                });
            });
        });
    });
});


//End of streamer?



//Start of followers
app.get('/rankings-followers', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    db.all(`SELECT * FROM Twitch ORDER BY Followers DESC LIMIT ? OFFSET ?`, [perPage, offset], (err, rows) => {
        if (err) return res.status(500).send('SQL Error');

        db.get(`SELECT COUNT(*) AS count FROM Twitch`, (err, result) => {
            if (err) return res.status(500).send('SQL Error');

            const totalCount = result.count;
            const totalPages = Math.ceil(totalCount / perPage);

            // ---- Pagination window (10 buttons max) ----
            const maxButtons = 10;
            let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
            let endPage = startPage + maxButtons - 1;

            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            // Page buttons
            let pageButtons = '';
            for (let i = startPage; i <= endPage; i++) {
                if (i === page) {
                    pageButtons += `<li class="current"><span>${i}</span></li>`;
                } else {
                    pageButtons += `<li><a href="/rankings-followers?page=${i}">${i}</a></li>`;
                }
            }

            // ---- Jump buttons ----
            const prev10 = page > 10 
                ? `<li><a href="/rankings-followers?page=${page-10}">-10</a></li>` 
                : '';

            const next10 = page + 10 <= totalPages 
                ? `<li><a href="/rankings-followers?page=${page+10}">+10</a></li>` 
                : '';

            // Read HTML template
            fs.readFile(path.join(template, 'rankings-followers.html'), 'utf8', (err, html) => {
                if (err) return res.status(500).send('Template Error');

                const htmlOutput = html
                    .replace('{{RANKINGS_TABLE_ROWS}}', rows.map((r, idx) => `
                        <tr>
                            <td>${offset + idx + 1}</td>
                            <td><a href="/streamer?channel=${encodeURIComponent(r.Channel)}">${r.Channel}</a></td>
                            <td>${r.Followers.toLocaleString()}</td>
                        </tr>`).join(''))
                    .replace('{{RANK_START}}', offset + 1)
                    .replace('{{RANK_END}}', offset + rows.length)
                    .replace('{{TOTAL_COUNT}}', totalCount)
                    .replace('{{PREVIOUS_PAGE_LINK}}', page > 1 ? `<li><a href="/rankings-followers?page=${page-1}">Prev</a></li>` : '')
                    .replace('{{NEXT_PAGE_LINK}}', page < totalPages ? `<li><a href="/rankings-followers?page=${page+1}">Next</a></li>` : '')
                    .replace('{{PAGE_NUMBER_BUTTONS}}', pageButtons)
                    .replace('{{PREVIOUS_10_PAGE_LINK}}', prev10)
                    .replace('{{NEXT_10_PAGE_LINK}}', next10);

                res.status(200).type('html').send(htmlOutput);
            });
        });
    });
});

//End of followers

//start of alphabet
// A–Z Streamer Directory
app.get('/streamers-alpha', (req, res) => {
    const letter = req.query.letter || 'A';
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Build alphabet buttons + hashtag
    let alphabetButtons = alphabet.map(l =>
        l === letter
            ? `<a class="button primary">${l}</a>`
            : `<a class="button" href="/streamers-alpha?letter=${l}">${l}</a>`
    );

    // Add hashtag button for non-A-Z names
    alphabetButtons.push(
        letter === '#' 
            ? `<a class="button primary">#</a>` 
            : `<a class="button" href="/streamers-alpha?letter=%23">#</a>`
    );

    alphabetButtons = alphabetButtons.join(' ');

    // Build SQL query
    let sqlQuery, sqlCount;
    if (letter === '#') {
        // Names NOT starting with A-Z
        sqlQuery = `
            SELECT * FROM Twitch 
            WHERE UPPER(SUBSTR(Channel,1,1)) NOT BETWEEN 'A' AND 'Z'
            ORDER BY Channel ASC 
            LIMIT ? OFFSET ?`;
        sqlCount = `
            SELECT COUNT(*) AS count FROM Twitch 
            WHERE UPPER(SUBSTR(Channel,1,1)) NOT BETWEEN 'A' AND 'Z'`;
    } else {
        // Names starting with the selected letter
        sqlQuery = `
            SELECT * FROM Twitch 
            WHERE UPPER(Channel) LIKE ?
            ORDER BY Channel ASC 
            LIMIT ? OFFSET ?`;
        sqlCount = `
            SELECT COUNT(*) AS count FROM Twitch 
            WHERE UPPER(Channel) LIKE ?`;
    }

    const queryParam = letter === '#' ? [] : [letter + '%'];

    db.all(sqlQuery, [...queryParam, perPage, offset], (err, rows) => {
        if (err) return res.status(500).send("SQL error");

        db.get(sqlCount, queryParam, (err, result) => {
            if (err) return res.status(500).send("SQL error");

            const totalCount = result.count;
            const totalPages = Math.ceil(totalCount / perPage);

            const streamersGrid = rows.map(r => `
                <div class="cell">
                    <div class="callout text-center">
                        <p>
                            <a href="/streamer?channel=${encodeURIComponent(r.Channel)}">
                                ${r.Channel}
                            </a>
                        </p>
                    </div>
                </div>
            `).join('');

            const prev = page > 1
                ? `<a class="button" href="/streamers-alpha?letter=${letter}&page=${page-1}">Prev</a>` : '';
            const next = page < totalPages
                ? `<a class="button" href="/streamers-alpha?letter=${letter}&page=${page+1}">Next</a>` : '';

            const pagination = `<div class="pagination">${prev} ${next}</div>`;

            fs.readFile(path.join(template, 'streamers-alpha.html'), 'utf8', (err, html) => {
                if (err) return res.status(500).send("Template error");

                const htmlOutput = html
                    .replace('{{ALPHABET_BUTTONS}}', alphabetButtons)
                    .replace('{{STREAMERS_GRID}}', streamersGrid)
                    .replace('{{PAGINATION}}', pagination);

                res.status(200).type('html').send(htmlOutput);
            });
        });
    });
});

//end of alphabet

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
