"use strict";

/* =========================================================
   YOUTUBE API KEY
========================================================= */

const YOUTUBE_API_KEY = "AIzaSyA4XBk2F0tJOla0Gk2VOQuDsd4zQxDKJtg";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const backgroundVideo =
    document.getElementById("background-video");

const backgroundVideoSource =
    document.getElementById("background-video-source");

const trafficCount =
    document.getElementById("traffic-count");

const themeButton =
    document.getElementById("theme-button");

const themeMenu =
    document.getElementById("theme-menu");

const themeOptions =
    document.querySelectorAll(".theme-option");

const songTitle =
    document.getElementById("song-title");

const songArtist =
    document.getElementById("song-artist");

const playButton =
    document.getElementById("play-button");

const previousButton =
    document.getElementById("previous-button");

const nextButton =
    document.getElementById("next-button");

const progressBar =
    document.getElementById("progress-bar");

const currentTimeElement =
    document.getElementById("current-time");

const durationElement =
    document.getElementById("duration");


/* =========================================================
   THEMES
========================================================= */

const themes = [

    {
        id: "travel",
        label: "Travel",
        video: "assets/videos/travel.mp4",
        search: "Hindi Bollywood travel songs"
    },

    {
        id: "highway",
        label: "Highway",
        video: "assets/videos/highway.mp4",
        search: "Hindi Bollywood road trip songs"
    },

    {
        id: "sleep",
        label: "Sleep",
        video: "assets/videos/sleep.mp4",
        search: "Hindi Bollywood relaxing songs"
    }

];


let currentTheme = themes[0];


/* =========================================================
   YOUTUBE VARIABLES
========================================================= */

let youtubePlayer = null;

let youtubeReady = false;

let youtubeApiLoaded = false;

let songPool = [];

let currentSongIndex = -1;

let songHistory = [];

let isPlaying = false;

let progressTimer = null;


/* =========================================================
   LOAD YOUTUBE IFRAME API
========================================================= */

/*
    IMPORTANT:

    We define onYouTubeIframeAPIReady BEFORE loading
    the YouTube API.

    This removes the race condition that was causing:

        "YouTube player isn't ready."
*/

function loadYouTubeAPI() {

    if (youtubeApiLoaded) {
        return;
    }

    youtubeApiLoaded = true;

    const script =
        document.createElement("script");

    script.src =
        "https://www.youtube.com/iframe_api";

    script.async = true;

    document.head.appendChild(script);
}


/* =========================================================
   YOUTUBE API CALLBACK
========================================================= */

/*
    YouTube calls this function automatically after
    the IFrame API has finished loading.
*/

window.onYouTubeIframeAPIReady = function () {

    console.log(
        "YouTube IFrame API is ready."
    );

    createYouTubePlayer();

};


/* =========================================================
   CREATE YOUTUBE PLAYER
========================================================= */

function createYouTubePlayer() {

    if (typeof YT === "undefined") {

        console.error(
            "YouTube API is not available."
        );

        return;
    }


    if (!document.getElementById("youtube-player")) {

        console.error(
            "youtube-player element was not found."
        );

        return;
    }


    youtubePlayer =
        new YT.Player(
            "youtube-player",
            {

                width: "320",

                height: "200",

                playerVars: {

                    autoplay: 0,

                    controls: 1,

                    playsinline: 1,

                    rel: 0,

                    origin:
                        window.location.origin

                },

                events: {

                    onReady:
                        onYouTubePlayerReady,

                    onStateChange:
                        onYouTubePlayerStateChange,

                    onError:
                        onYouTubePlayerError

                }

            }
        );
}


/* =========================================================
   YOUTUBE PLAYER READY
========================================================= */

function onYouTubePlayerReady(event) {

    console.log(
        "YouTube player is READY."
    );

    youtubePlayer = event.target;

    youtubeReady = true;


    /*
        Now that YouTube is ready, search for songs.
        
        IMPORTANT:
        We DO NOT automatically play the first song.
        We only cue it.
    */

    findRandomSongs(false);
}


/* =========================================================
   YOUTUBE PLAYER ERROR
========================================================= */

function onYouTubePlayerError(event) {

    console.error(
        "YouTube player error:",
        event.data
    );


    /*
        Common YouTube errors:

        100  = video unavailable
        101  = embedding not allowed
        150  = embedding not allowed
        153  = missing HTTP Referer / origin problem
    */

    if (
        event.data === 100 ||
        event.data === 101 ||
        event.data === 150
    ) {

        console.warn(
            "This YouTube video cannot be embedded. Skipping it."
        );

        nextSong();
    }
}


/* =========================================================
   YOUTUBE STATE CHANGE
========================================================= */

function onYouTubePlayerStateChange(event) {

    if (!youtubeReady) {
        return;
    }


    switch (event.data) {

        case YT.PlayerState.PLAYING:

            isPlaying = true;

            updatePlayButton();

            startProgressTimer();

            break;


        case YT.PlayerState.PAUSED:

            isPlaying = false;

            updatePlayButton();

            stopProgressTimer();

            break;


        case YT.PlayerState.ENDED:

            isPlaying = false;

            updatePlayButton();

            stopProgressTimer();

            nextSong();

            break;


        case YT.PlayerState.BUFFERING:

            break;


        case YT.PlayerState.CUED:

            updateProgressInformation();

            break;

    }

}


/* =========================================================
   SEARCH YOUTUBE
========================================================= */

async function searchYouTube(searchQuery) {

    if (
        !YOUTUBE_API_KEY ||
        YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY"
    ) {

        console.error(
            "YouTube API key is missing."
        );

        songTitle.textContent =
            "Add your YouTube API key";

        songArtist.textContent =
            "Open js/script.js";

        return [];
    }


    const url =
        new URL(
            "https://www.googleapis.com/youtube/v3/search"
        );


    url.searchParams.set(
        "part",
        "snippet"
    );

    url.searchParams.set(
        "q",
        searchQuery
    );

    url.searchParams.set(
        "type",
        "video"
    );

    url.searchParams.set(
        "videoCategoryId",
        "10"
    );

    url.searchParams.set(
        "videoEmbeddable",
        "true"
    );

    url.searchParams.set(
        "maxResults",
        "50"
    );

    url.searchParams.set(
        "key",
        YOUTUBE_API_KEY
    );


    try {

        const response =
            await fetch(url);


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "YouTube API error:",
                errorText
            );

            throw new Error(
                `YouTube API returned ${response.status}`
            );
        }


        const data =
            await response.json();


        if (!data.items) {

            return [];
        }


        return data.items

            .filter(item =>
                item.id &&
                item.id.videoId
            )

            .map(item => ({

                videoId:
                    item.id.videoId,

                title:
                    item.snippet.title,

                channel:
                    item.snippet.channelTitle

            }));


    } catch (error) {

        console.error(
            "Could not search YouTube:",
            error
        );

        songTitle.textContent =
            "Unable to find songs";

        songArtist.textContent =
            "Check your API key";

        return [];
    }

}


/* =========================================================
   SHUFFLE ARRAY
========================================================= */

function shuffleArray(array) {

    const shuffled =
        [...array];


    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            shuffled[i],
            shuffled[j]
        ] =
        [
            shuffled[j],
            shuffled[i]
        ];
    }


    return shuffled;
}


/* =========================================================
   FIND RANDOM SONGS
========================================================= */

async function findRandomSongs(
    shouldPlay = false
) {

    if (!youtubeReady) {

        console.warn(
            "YouTube player isn't ready yet."
        );

        return;
    }


    songTitle.textContent =
        "Finding a song...";

    songArtist.textContent =
        currentTheme.label;


    const songs =
        await searchYouTube(
            currentTheme.search
        );


    if (!songs.length) {

        songTitle.textContent =
            "No songs found";

        songArtist.textContent =
            "Try again";

        return;
    }


    songPool =
        shuffleArray(songs);


    currentSongIndex = -1;


    /*
        Get the first random song.
    */

    playRandomFromPool(
        shouldPlay
    );

}


/* =========================================================
   PLAY RANDOM SONG FROM POOL
========================================================= */

function playRandomFromPool(
    shouldPlay = true
) {

    if (!youtubeReady) {

        console.warn(
            "YouTube player isn't ready."
        );

        return;
    }


    if (
        !songPool ||
        songPool.length === 0
    ) {

        findRandomSongs(
            shouldPlay
        );

        return;
    }


    currentSongIndex++;


    /*
        If we've reached the end of the pool,
        get another batch from YouTube.
    */

    if (
        currentSongIndex >=
        songPool.length
    ) {

        findRandomSongs(
            shouldPlay
        );

        return;
    }


    const song =
        songPool[currentSongIndex];


    if (!song) {
        return;
    }


    /*
        Save previous song to history.
    */

    if (
        currentSongIndex > 0
    ) {

        const previousSong =
            songPool[
                currentSongIndex - 1
            ];


        if (previousSong) {

            songHistory.push(
                previousSong
            );
        }
    }


    updateSongInformation(
        song
    );


    /*
        IMPORTANT:

        cueVideoById()
        = load video WITHOUT playing

        loadVideoById()
        = load AND play
    */

    if (shouldPlay) {

        youtubePlayer.loadVideoById(
            song.videoId
        );

    } else {

        youtubePlayer.cueVideoById(
            song.videoId
        );

    }


    isPlaying =
        shouldPlay;


    updatePlayButton();

}


/* =========================================================
   UPDATE SONG INFORMATION
========================================================= */

function updateSongInformation(song) {

    songTitle.textContent =
        cleanYouTubeTitle(
            song.title
        );

    songArtist.textContent =
        song.channel || "YouTube";

}


/* =========================================================
   CLEAN YOUTUBE TITLE
========================================================= */

function cleanYouTubeTitle(title) {

    if (!title) {
        return "Unknown song";
    }


    return title

        .replace(
            /\[[^\]]*\]/g,
            ""
        )

        .replace(
            /\([^)]*\)/g,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!youtubeReady) {

        console.warn(
            "YouTube player isn't ready."
        );

        return;
    }


    if (!youtubePlayer) {
        return;
    }


    const state =
        youtubePlayer.getPlayerState();


    if (
        state === YT.PlayerState.PLAYING
    ) {

        youtubePlayer.pauseVideo();

    } else {

        /*
            If a song has already been cued,
            play it.
        */

        youtubePlayer.playVideo();
    }

}


/* =========================================================
   UPDATE PLAY BUTTON
========================================================= */

function updatePlayButton() {

    if (isPlaying) {

        playButton.textContent =
            "❚❚";

        playButton.setAttribute(
            "aria-label",
            "Pause"
        );

    } else {

        playButton.textContent =
            "▶";

        playButton.setAttribute(
            "aria-label",
            "Play"
        );

    }

}


/* =========================================================
   NEXT SONG
========================================================= */

function nextSong() {

    if (!youtubeReady) {
        return;
    }


    /*
        If there are more songs in our
        already downloaded random pool,
        use one without another API request.
    */

    if (
        currentSongIndex + 1 <
        songPool.length
    ) {

        playRandomFromPool(
            true
        );

        return;
    }


    /*
        Otherwise search YouTube again.
    */

    findRandomSongs(
        true
    );

}


/* =========================================================
   PREVIOUS SONG
========================================================= */

function previousSong() {

    if (!youtubeReady) {
        return;
    }


    if (
        songHistory.length === 0
    ) {

        return;
    }


    const previousSong =
        songHistory.pop();


    if (!previousSong) {
        return;
    }


    updateSongInformation(
        previousSong
    );


    /*
        Previous is a user action,
        so playing it is allowed.
    */

    youtubePlayer.loadVideoById(
        previousSong.videoId
    );


    isPlaying = true;

    updatePlayButton();

}


/* =========================================================
   PROGRESS TIMER
========================================================= */

function startProgressTimer() {

    stopProgressTimer();


    progressTimer =
        setInterval(
            updateProgressInformation,
            500
        );

}


/* =========================================================
   STOP PROGRESS TIMER
========================================================= */

function stopProgressTimer() {

    if (progressTimer) {

        clearInterval(
            progressTimer
        );

        progressTimer = null;
    }

}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgressInformation() {

    if (
        !youtubeReady ||
        !youtubePlayer
    ) {

        return;
    }


    try {

        const current =
            youtubePlayer.getCurrentTime();


        const duration =
            youtubePlayer.getDuration();


        if (
            !duration ||
            duration <= 0
        ) {

            return;
        }


        const percentage =
            (current / duration) * 100;


        progressBar.value =
            percentage;


        currentTimeElement.textContent =
            formatTime(current);


        durationElement.textContent =
            formatTime(duration);


    } catch (error) {

        console.warn(
            "Progress update failed:",
            error
        );

    }

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {

    if (
        !seconds ||
        !isFinite(seconds)
    ) {

        return "0:00";
    }


    seconds =
        Math.floor(seconds);


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        seconds % 60;


    return `${minutes}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;

}


/* =========================================================
   SEEK SONG
========================================================= */

function seekSong() {

    if (
        !youtubeReady ||
        !youtubePlayer
    ) {

        return;
    }


    const duration =
        youtubePlayer.getDuration();


    if (
        !duration ||
        duration <= 0
    ) {

        return;
    }


    const percentage =
        Number(
            progressBar.value
        );


    const newTime =
        duration *
        (percentage / 100);


    youtubePlayer.seekTo(
        newTime,
        true
    );

}


/* =========================================================
   CHANGE THEME
========================================================= */

function changeTheme(themeId) {

    const selectedTheme =
        themes.find(
            theme =>
                theme.id === themeId
        );


    if (!selectedTheme) {
        return;
    }


    currentTheme =
        selectedTheme;


    /*
        Change background video.
    */

    backgroundVideo.pause();


    backgroundVideoSource.src =
        currentTheme.video;


    backgroundVideo.load();


    backgroundVideo.play()
        .catch(() => {
            /*
                Browser may block autoplay.
                That's okay because the video is muted.
            */
        });


    /*
        Reset song pool.
    */

    songPool = [];

    currentSongIndex = -1;


    /*
        Search songs matching the new theme.
    */

    if (youtubeReady) {

        findRandomSongs(
            false
        );

    }


    closeThemeMenu();

}


/* =========================================================
   THEME MENU
========================================================= */

function toggleThemeMenu() {

    const isOpen =
        !themeMenu.hidden;


    if (isOpen) {

        closeThemeMenu();

    } else {

        themeMenu.hidden =
            false;

        themeButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }

}


/* =========================================================
   CLOSE THEME MENU
========================================================= */

function closeThemeMenu() {

    themeMenu.hidden =
        true;

    themeButton.setAttribute(
        "aria-expanded",
        "false"
    );

}


/* =========================================================
   TRAFFIC COUNT
========================================================= */

function updateTrafficCount() {

    const current =
        parseInt(
            trafficCount.textContent,
            10
        ) || 120;


    const drift =
        Math.floor(
            Math.random() * 11
        ) - 5;


    const next =
        Math.max(
            40,
            current + drift
        );


    trafficCount.textContent =
        next;

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

playButton.addEventListener(
    "click",
    togglePlay
);


nextButton.addEventListener(
    "click",
    nextSong
);


previousButton.addEventListener(
    "click",
    previousSong
);


progressBar.addEventListener(
    "input",
    seekSong
);


themeButton.addEventListener(
    "click",
    toggleThemeMenu
);


themeOptions.forEach(
    option => {

        option.addEventListener(
            "click",
            () => {

                const themeId =
                    option.dataset.theme;


                changeTheme(
                    themeId
                );

            }
        );

    }
);


/* =========================================================
   CLOSE THEME MENU WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    event => {

        const clickedInside =
            event.target.closest(
                ".theme-wrapper"
            );


        if (!clickedInside) {

            closeThemeMenu();

        }

    }
);


/* =========================================================
   TRAFFIC COUNT TIMER
========================================================= */

setInterval(
    updateTrafficCount,
    4000
);


/* =========================================================
   INITIALIZE YOUTUBE
========================================================= */

/*
    This is intentionally at the END.

    script.js has already defined:

        window.onYouTubeIframeAPIReady

    before this function loads the YouTube API.
*/

loadYouTubeAPI();