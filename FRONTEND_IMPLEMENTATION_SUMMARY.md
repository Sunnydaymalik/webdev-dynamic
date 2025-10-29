# Frontend Stuff Done
oct 29 2025 - eli

## what i did

**package.json**
- added author and contributors
- added repo url

**games to languages**
- renamed games.html to languages.html
- changed all game stuff to language stuff in all templates
- updated nav links

**charts** (this is the 4 pts we need!)
- made app.js with all the chart code
- added 5 charts total:
  - home: bar chart for top streamers + pie chart for languages
  - rankings: horizontal bar chart
  - languages: bar chart
  - streamer profile: radar chart
- used chart.js from cdn

**templates**
- updated index, rankings, streamer htmls
- made new languages.html
- deleted old games.html

## jahir - backend stuff you gotta do

**need 3+ routes with sqlite queries**

route 1 - home page `/`
- get top 10 streamers for featured section
- get total counts for stats
- need to embed chart data (see below)

route 2 - rankings `/rankings`
- get paginated list of streamers
- fill in the table

route 3 - streamer page `/streamer/:channel` **IMPORTANT**
- get specific streamer by channel name
- get prev/next streamer for navigation (worth 4 pts)
- if channel doesnt exist send 404 error (worth 4 pts)
- normalize metrics to 0-100 for radar chart

optional route 4 - languages page
- show all languages with counts
- or filter by specific language

**for charts to work** - embed data in html like this before closing body tag:
```javascript
<script>
window.topStreamersData = {
    labels: ['xQcOW', 'summit1g', ...],
    watchtime: [6196161750, 6091677300, ...]
};
</script>
```

what each page needs:
- index.html: topStreamersData and languageData
- rankings.html: rankingsData
- languages.html: languageStatsData  
- streamer.html: streamerMetricsData (normalized 0-100)

**prev/next links (4 pts)**
for streamer page get prev and next streamer then make html like:
```javascript
let prevLink = `<li><a href="/streamer/${prevChannel}">Previous</a></li>`;
let nextLink = `<li><a href="/streamer/${nextChannel}">Next</a></li>`;
```

**404 handling (4 pts)**
```javascript
db.get("SELECT * FROM Twitch WHERE Channel = ?", [channel], (err, row) => {
    if (!row) {
        res.status(404).send(`Error: no data for streamer "${channel}"`);
        return;
    }
});
```

**sql queries you need:**

top streamers:
```sql
SELECT Channel, Watchtime FROM Twitch ORDER BY Watchtime DESC LIMIT 10;
```

language counts:
```sql
SELECT Language, COUNT(*) as count FROM Twitch GROUP BY Language ORDER BY count DESC;
```

get specific streamer:
```sql
SELECT * FROM Twitch WHERE Channel = ?;
```

prev streamer:
```sql
SELECT Channel FROM Twitch WHERE Watchtime < (SELECT Watchtime FROM Twitch WHERE Channel = ?) ORDER BY Watchtime DESC LIMIT 1;
```

next streamer:
```sql
SELECT Channel FROM Twitch WHERE Watchtime > (SELECT Watchtime FROM Twitch WHERE Channel = ?) ORDER BY Watchtime ASC LIMIT 1;
```

**template placeholders to fill in:**

index.html - FEATURED_STREAMERS, TOTAL_STREAMERS, TOTAL_LANGUAGES, TOTAL_WATCH_TIME

rankings.html - RANKINGS_TABLE_ROWS, RANK_START, RANK_END, TOTAL_COUNT, PREVIOUS_PAGE_LINK, NEXT_PAGE_LINK

streamer.html - STREAMER_NAME, CHANNEL_NAME, LANGUAGE, FOLLOWERS, WATCH_TIME, STREAM_TIME, RANK, PEAK_VIEWERS, STREAMER_THUMBNAIL, STREAM_PREVIEW, PREVIOUS_STREAMER_LINK, NEXT_STREAMER_LINK

languages.html - LANGUAGES_GRID, LANGUAGE_DETAIL_SECTION, LANGUAGE_STREAMERS_SECTION, pagination stuff

## whats left to do

jahir backend:
- make 3+ routes with sqlite
- populate all the placeholders
- add chart data
- prev/next links (4 pts)
- 404 handling (4 pts)

testing after jahir done:
- run node dynamic_server.mjs
- check all pages work
- test charts render
- test prev/next work
- test 404 works

then deploy to render.com and submit

## scoring
- base stuff (38 pts) - mostly done need backend
- charts (4 pts) - done
- prev/next (4 pts) - jahir
- 404 (4 pts) - jahir
total = 50 pts = A

