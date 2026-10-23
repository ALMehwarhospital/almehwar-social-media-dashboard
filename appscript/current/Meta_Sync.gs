/* =====================================================
   ALMEHWAR SOCIAL MEDIA DATA SYSTEM
   Meta Graph API v26.0

   - Facebook Raw
   - Instagram Raw
   - Pagination
   - Historical Backfill
   - Upsert
   - FB ↔ IG Reel Matching
   - Missing Caption Time Fallback
===================================================== */


const META_API_VERSION = 'v26.0';

const FACEBOOK_PAGE_ID = '112261600179406';
const INSTAGRAM_ACCOUNT_ID = '17841425470104627';

const FACEBOOK_RAW_SHEET = 'Facebook Raw';
const INSTAGRAM_RAW_SHEET = 'Instagram Raw';


/*
  Meta pagination page size.

  ده مش معناه إننا بناخد 50 بس.
  الكود بيكمل Pagination لحد ما يوصل
  للتاريخ المطلوب.
*/
const META_PAGE_SIZE = 50;


/*
  حماية من loop غير منتهي.
*/
const META_MAX_PAGES = 50;


/*
  التحديث العادي هيعيد تحديث آخر 14 يوم.

  السبب:
  Lifetime metrics للمحتوى الحديث
  بتتغير بعد النشر.
*/
const META_REGULAR_LOOKBACK_DAYS = 14;



/* =====================================================
   1. REGULAR META SYNC
===================================================== */

function pullMetaRawData() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  ss.setSpreadsheetTimeZone(
    'Africa/Cairo'
  );


  const endDate =
    new Date();


  const startDate =
    new Date(
      endDate.getTime()
      -
      (
        META_REGULAR_LOOKBACK_DAYS
        *
        24
        *
        60
        *
        60
        *
        1000
      )
    );


  console.log(
    `Regular sync from ${startDate} to ${endDate}`
  );


  pullFacebookRawForPeriod(
    startDate,
    endDate
  );


  pullInstagramRawForPeriod(
    startDate,
    endDate
  );


  matchInstagramReelsWithFacebook();


  console.log(
    'Regular Meta sync completed successfully.'
  );
}



/* =====================================================
   2. MONTHLY BACKFILL FUNCTIONS
===================================================== */

function backfillJune2026() {

  runHistoricalBackfill(
    new Date(
      '2026-06-01T00:00:00+03:00'
    ),
    new Date(
      '2026-07-01T00:00:00+03:00'
    ),
    'June 2026'
  );
}


function backfillJuly2026() {

  runHistoricalBackfill(
    new Date(
      '2026-07-01T00:00:00+03:00'
    ),
    new Date(
      '2026-08-01T00:00:00+03:00'
    ),
    'July 2026'
  );
}


function backfillAugust2026() {

  runHistoricalBackfill(
    new Date(
      '2026-08-01T00:00:00+03:00'
    ),
    new Date(
      '2026-09-01T00:00:00+03:00'
    ),
    'August 2026'
  );
}


function backfillSeptember2026() {

  runHistoricalBackfill(
    new Date(
      '2026-09-01T00:00:00+03:00'
    ),
    new Date(
      '2026-10-01T00:00:00+03:00'
    ),
    'September 2026'
  );
}



/* =====================================================
   3. HISTORICAL BACKFILL ENGINE
===================================================== */

function runHistoricalBackfill(
  startDate,
  endDate,
  label
) {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  ss.setSpreadsheetTimeZone(
    'Africa/Cairo'
  );


  console.log(
    `Starting historical backfill: ${label}`
  );


  console.log(
    `Period: ${startDate} → ${endDate}`
  );


  pullFacebookRawForPeriod(
    startDate,
    endDate
  );


  pullInstagramRawForPeriod(
    startDate,
    endDate
  );


  matchInstagramReelsWithFacebook();


  console.log(
    `${label} historical backfill completed.`
  );
}



/* =====================================================
   4. FACEBOOK PERIOD SYNC
===================================================== */

function pullFacebookRawForPeriod(
  startDate,
  endDate
) {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const headers = [

    'Date',
    'Facebook Post ID',
    'Type',
    'Content Title',
    'Full Caption',
    'Link',

    'Media Views',
    'Unique Viewers',

    'Reactions',
    'Comments',
    'Shares',
    'Interactions',

    'Link Clicks',

    'Video Duration (Sec)',
    'Avg Watch Time (Sec)',
    'Average % Watched',
    'Total Watch Time (Hours)',

    'Organic 3s+ Views',
    '97% Organic Completions',
    'Organic Completion Rate',

    'Last Synced'
  ];


  const sheet =
    ensureRawSheet(
      ss,
      FACEBOOK_RAW_SHEET,
      headers,
      2
    );


  const posts =
    fetchFacebookPostsForPeriod(
      startDate,
      endDate
    );


  console.log(
    `Facebook items found in period: ${posts.length}`
  );


  const rows = [];


  posts.forEach(
    post => {

      const postId =
        String(
          post.id || ''
        );


      const isReel =
        String(
          post.permalink_url || ''
        ).includes(
          '/reel/'
        );


      const title =
        makeContentTitle(
          post.message || ''
        );


      /* =============================================
         ENGAGEMENT
      ============================================= */

      let reactions = 0;
      let comments = 0;
      let shares = 0;


      try {

        const engagement =
          metaGet(
            postId,
            {
              fields:
                'reactions.limit(0).summary(true),' +
                'comments.limit(0).summary(true),' +
                'shares'
            }
          );


        reactions =
          engagement
            .reactions
            ?.summary
            ?.total_count
          || 0;


        comments =
          engagement
            .comments
            ?.summary
            ?.total_count
          || 0;


        shares =
          engagement
            .shares
            ?.count
          || 0;

      } catch (error) {

        console.log(
          `Facebook engagement error ${postId}: ${error.message}`
        );
      }


      /*
        تعريفنا الداخلي للـInteractions:

        Reactions
        +
        Comments
        +
        Shares

        Link Clicks غير داخلة.
      */

      const interactions =
        reactions
        +
        comments
        +
        shares;


      /* =============================================
         BASIC INSIGHTS
      ============================================= */

      const basicInsights =
        safeGetInsights(
          postId,
          [
            'post_media_view',
            'post_total_media_view_unique',
            'post_clicks_by_type'
          ]
        );


      const mediaViews =
        getInsightValue(
          basicInsights,
          'post_media_view'
        );


      const uniqueViewers =
        getInsightValue(
          basicInsights,
          'post_total_media_view_unique'
        );


      const clickTypes =
        getInsightValue(
          basicInsights,
          'post_clicks_by_type'
        )
        || {};


      const linkClicks =
        clickTypes[
          'link clicks'
        ]
        || 0;


      /* =============================================
         VIDEO INSIGHTS
      ============================================= */

      let videoDuration = '';
      let avgWatchTime = '';
      let averagePercentWatched = '';
      let totalWatchHours = '';

      let organic3sViews = '';
      let organicCompletions = '';
      let organicCompletionRate = '';


      if (
        isReel
      ) {

        const videoInsights =
          safeGetInsights(
            postId,
            [
              'post_video_length',
              'post_video_avg_time_watched',
              'post_video_view_time',
              'post_video_views_organic',
              'post_video_complete_views_organic'
            ]
          );


        const durationMs =
          getInsightValue(
            videoInsights,
            'post_video_length'
          );


        const avgWatchMs =
          getInsightValue(
            videoInsights,
            'post_video_avg_time_watched'
          );


        const totalWatchMs =
          getInsightValue(
            videoInsights,
            'post_video_view_time'
          );


        organic3sViews =
          getInsightValue(
            videoInsights,
            'post_video_views_organic'
          );


        organicCompletions =
          getInsightValue(
            videoInsights,
            'post_video_complete_views_organic'
          );


        if (
          durationMs !== ''
        ) {

          videoDuration =
            Number(
              durationMs
            )
            /
            1000;
        }


        if (
          avgWatchMs !== ''
        ) {

          avgWatchTime =
            Number(
              avgWatchMs
            )
            /
            1000;
        }


        if (
          videoDuration !== ''
          &&
          Number(
            videoDuration
          ) > 0
          &&
          avgWatchTime !== ''
        ) {

          averagePercentWatched =
            Number(
              avgWatchTime
            )
            /
            Number(
              videoDuration
            );
        }


        if (
          totalWatchMs !== ''
        ) {

          totalWatchHours =
            Number(
              totalWatchMs
            )
            /
            3600000;
        }


        if (
          organic3sViews !== ''
          &&
          Number(
            organic3sViews
          ) > 0
          &&
          organicCompletions !== ''
        ) {

          organicCompletionRate =
            Number(
              organicCompletions
            )
            /
            Number(
              organic3sViews
            );
        }
      }


      rows.push([

        new Date(
          post.created_time
        ),

        postId,

        isReel
          ? 'Reel'
          : 'Post',

        title,

        post.message || '',

        post.permalink_url || '',

        mediaViews,

        uniqueViewers,

        reactions,

        comments,

        shares,

        interactions,

        linkClicks,

        videoDuration,

        avgWatchTime,

        averagePercentWatched,

        totalWatchHours,

        organic3sViews,

        organicCompletions,

        organicCompletionRate,

        new Date()
      ]);
    }
  );


  upsertRowsById(
    sheet,
    rows,
    2
  );


  formatFacebookRaw(
    sheet
  );
}



/* =====================================================
   5. FACEBOOK PAGINATION
===================================================== */

function fetchFacebookPostsForPeriod(
  startDate,
  endDate
) {

  let after = '';

  let pageNumber = 0;

  let finished = false;

  const result = [];


  while (
    !finished
    &&
    pageNumber < META_MAX_PAGES
  ) {

    pageNumber++;


    const params = {

      fields:
        'id,message,created_time,permalink_url',

      limit:
        META_PAGE_SIZE
    };


    if (
      after
    ) {

      params.after =
        after;
    }


    const response =
      metaGet(
        `${FACEBOOK_PAGE_ID}/posts`,
        params
      );


    const data =
      response.data
      ||
      [];


    if (
      !data.length
    ) {

      break;
    }


    console.log(
      `Facebook pagination page ${pageNumber}: ${data.length} items`
    );


    let pageContainsOlderItem =
      false;


    data.forEach(
      post => {

        const date =
          new Date(
            post.created_time
          );


        if (
          date < startDate
        ) {

          pageContainsOlderItem =
            true;

          return;
        }


        if (
          date >= startDate
          &&
          date < endDate
        ) {

          result.push(
            post
          );
        }
      }
    );


    if (
      pageContainsOlderItem
    ) {

      finished =
        true;

      break;
    }


    after =
      response
        .paging
        ?.cursors
        ?.after
      || '';


    if (
      !after
    ) {

      break;
    }
  }


  return result;
}



/* =====================================================
   6. INSTAGRAM PERIOD SYNC
===================================================== */

function pullInstagramRawForPeriod(
  startDate,
  endDate
) {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const headers = [

    'Date',
    'Instagram Media ID',

    'Media Type',
    'Product Type',

    'Content Title',
    'Full Caption',
    'Link',

    'Views',
    'Reach',

    'Likes',
    'Comments',
    'Shares',
    'Saves',
    'Reposts',

    'Meta Total Interactions',

    'Avg Watch Time (Sec)',
    'Total Watch Time (Hours)',

    'Skip Rate',
    'Derived 3s Hold Rate',

    'Video Duration (Sec)',
    'Average % Watched',

    'Last Synced'
  ];


  const sheet =
    ensureRawSheet(
      ss,
      INSTAGRAM_RAW_SHEET,
      headers,
      2
    );


  const mediaList =
    fetchInstagramMediaForPeriod(
      startDate,
      endDate
    );


  console.log(
    `Instagram items found in period: ${mediaList.length}`
  );


  const rows = [];


  mediaList.forEach(
    media => {

      const mediaId =
        String(
          media.id || ''
        );


      const isReel =
        media.media_product_type ===
        'REELS';


      const title =
        makeContentTitle(
          media.caption || ''
        );


      /* =============================================
         BASIC INSIGHTS
      ============================================= */

      const basicInsights =
        safeGetInsights(
          mediaId,
          [
            'views',
            'reach',
            'likes',
            'comments',
            'saved',
            'shares',
            'total_interactions'
          ]
        );


      const views =
        getInsightValue(
          basicInsights,
          'views'
        );


      const reach =
        getInsightValue(
          basicInsights,
          'reach'
        );


      const likes =
        getInsightValue(
          basicInsights,
          'likes'
        );


      const comments =
        getInsightValue(
          basicInsights,
          'comments'
        );


      const saves =
        getInsightValue(
          basicInsights,
          'saved'
        );


      const shares =
        getInsightValue(
          basicInsights,
          'shares'
        );


      /*
        Meta total_interactions
        هو الرقم الأساسي المعتمد للـInstagram.
      */

      const totalInteractions =
        getInsightValue(
          basicInsights,
          'total_interactions'
        );


      /* =============================================
         REELS INSIGHTS
      ============================================= */

      let reposts = '';

      let avgWatchTime = '';

      let totalWatchHours = '';

      let skipRate = '';

      let holdRate3s = '';


      /*
        يتم ملؤهم بعد الـFB Match.
      */

      let videoDuration = '';

      let averagePercentWatched = '';


      if (
        isReel
      ) {

        const reelInsights =
          safeGetInsights(
            mediaId,
            [
              'reposts',
              'ig_reels_avg_watch_time',
              'ig_reels_video_view_total_time',
              'reels_skip_rate'
            ]
          );


        reposts =
          getInsightValue(
            reelInsights,
            'reposts'
          );


        const avgWatchMs =
          getInsightValue(
            reelInsights,
            'ig_reels_avg_watch_time'
          );


        const totalWatchMs =
          getInsightValue(
            reelInsights,
            'ig_reels_video_view_total_time'
          );


        const skipRatePercent =
          getInsightValue(
            reelInsights,
            'reels_skip_rate'
          );


        if (
          avgWatchMs !== ''
        ) {

          avgWatchTime =
            Number(
              avgWatchMs
            )
            /
            1000;
        }


        if (
          totalWatchMs !== ''
        ) {

          totalWatchHours =
            Number(
              totalWatchMs
            )
            /
            3600000;
        }


        if (
          skipRatePercent !== ''
        ) {

          skipRate =
            Number(
              skipRatePercent
            )
            /
            100;


          /*
            Derived metric.
          */

          holdRate3s =
            1
            -
            skipRate;
        }
      }


      rows.push([

        new Date(
          media.timestamp
        ),

        mediaId,

        media.media_type || '',

        media.media_product_type || '',

        title,

        media.caption || '',

        media.permalink || '',

        views,

        reach,

        likes,

        comments,

        shares,

        saves,

        reposts,

        totalInteractions,

        avgWatchTime,

        totalWatchHours,

        skipRate,

        holdRate3s,

        videoDuration,

        averagePercentWatched,

        new Date()
      ]);
    }
  );


  upsertRowsById(
    sheet,
    rows,
    2
  );


  formatInstagramRaw(
    sheet
  );
}



/* =====================================================
   7. INSTAGRAM PAGINATION
===================================================== */

function fetchInstagramMediaForPeriod(
  startDate,
  endDate
) {

  let after = '';

  let pageNumber = 0;

  let finished = false;

  const result = [];


  while (
    !finished
    &&
    pageNumber < META_MAX_PAGES
  ) {

    pageNumber++;


    const params = {

      fields:
        'id,' +
        'caption,' +
        'media_type,' +
        'media_product_type,' +
        'timestamp,' +
        'permalink',

      limit:
        META_PAGE_SIZE
    };


    if (
      after
    ) {

      params.after =
        after;
    }


    const response =
      metaGet(
        `${INSTAGRAM_ACCOUNT_ID}/media`,
        params
      );


    const data =
      response.data
      ||
      [];


    if (
      !data.length
    ) {

      break;
    }


    console.log(
      `Instagram pagination page ${pageNumber}: ${data.length} items`
    );


    let pageContainsOlderItem =
      false;


    data.forEach(
      media => {

        const date =
          new Date(
            media.timestamp
          );


        if (
          date < startDate
        ) {

          pageContainsOlderItem =
            true;

          return;
        }


        if (
          date >= startDate
          &&
          date < endDate
        ) {

          result.push(
            media
          );
        }
      }
    );


    if (
      pageContainsOlderItem
    ) {

      finished =
        true;

      break;
    }


    after =
      response
        .paging
        ?.cursors
        ?.after
      || '';


    if (
      !after
    ) {

      break;
    }
  }


  return result;
}



/* =====================================================
   8. FB ↔ IG REEL MATCHING

   Normal:
   Caption + Title + Time

   Edge case:
   If Instagram Caption is missing,
   use ultra-conservative Time Fallback.
===================================================== */

function matchInstagramReelsWithFacebook() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const fbSheet =
    ss.getSheetByName(
      FACEBOOK_RAW_SHEET
    );


  const igSheet =
    ss.getSheetByName(
      INSTAGRAM_RAW_SHEET
    );


  if (
    !fbSheet
    ||
    !igSheet
  ) {

    throw new Error(
      'Facebook Raw أو Instagram Raw مش موجود.'
    );
  }


  /*
    Instagram Columns:

    T = 20 Video Duration
    U = 21 Average % Watched

    W = 23 Matched Facebook Post ID
    X = 24 Match Confidence
    Y = 25 Match Score
    Z = 26 Duration Source
  */

  const MATCH_FB_ID_COL = 23;

  const MATCH_CONF_COL = 24;

  const MATCH_SCORE_COL = 25;

  const DURATION_SOURCE_COL = 26;


  igSheet
    .getRange(
      1,
      MATCH_FB_ID_COL,
      1,
      4
    )
    .setValues([[
      'Matched Facebook Post ID',
      'Match Confidence',
      'Match Score',
      'Duration Source'
    ]]);


  igSheet
    .getRange(
      1,
      MATCH_FB_ID_COL,
      1,
      4
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      '#FFFFFF'
    )
    .setBackground(
      '#0E3145'
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    )
    .setWrap(
      true
    );


  const fbLastRow =
    fbSheet.getLastRow();


  const igLastRow =
    igSheet.getLastRow();


  if (
    fbLastRow < 2
    ||
    igLastRow < 2
  ) {

    return;
  }


  const fbData =
    fbSheet
      .getRange(
        2,
        1,
        fbLastRow - 1,
        21
      )
      .getValues();


  const igData =
    igSheet
      .getRange(
        2,
        1,
        igLastRow - 1,
        22
      )
      .getValues();


  /* =================================================
     BUILD FACEBOOK REEL POOL
  ================================================= */

  const facebookReels = [];


  fbData.forEach(
    (row, index) => {

      const type =
        String(
          row[2] || ''
        ).trim();


      if (
        type !== 'Reel'
      ) {

        return;
      }


      const duration =
        safeMatchNumber(
          row[13]
        );


      if (
        !duration
        ||
        duration <= 0
      ) {

        return;
      }


      facebookReels.push({

        sheetRow:
          index + 2,

        date:
          row[0],

        id:
          String(
            row[1] || ''
          ),

        title:
          String(
            row[3] || ''
          ),

        caption:
          String(
            row[4] || ''
          ),

        duration:
          duration
      });
    }
  );


  /* =================================================
     CLEAR OLD IG REEL MATCH DATA
  ================================================= */

  igData.forEach(
    (row, index) => {

      const productType =
        String(
          row[3] || ''
        ).trim();


      if (
        productType !== 'REELS'
      ) {

        return;
      }


      const sheetRow =
        index + 2;


      /*
        Video Duration
      */

      igSheet
        .getRange(
          sheetRow,
          20
        )
        .clearContent();


      /*
        Average % Watched
      */

      igSheet
        .getRange(
          sheetRow,
          21
        )
        .clearContent();


      /*
        Match Audit Fields
      */

      igSheet
        .getRange(
          sheetRow,
          MATCH_FB_ID_COL,
          1,
          4
        )
        .clearContent();
    }
  );


  /*
    نفس FB Reel مينفعش
    يستخدم مع أكثر من IG Reel.
  */

  const usedFacebookIds =
    new Set();


  /* =================================================
     MATCH EACH IG REEL
  ================================================= */

  igData.forEach(
    (igRow, index) => {

      const productType =
        String(
          igRow[3] || ''
        ).trim();


      if (
        productType !== 'REELS'
      ) {

        return;
      }


      const igSheetRow =
        index + 2;


      const igDate =
        igRow[0];


      const igTitle =
        String(
          igRow[4] || ''
        );


      const igCaption =
        String(
          igRow[5] || ''
        );


      const igAvgWatch =
        safeMatchNumber(
          igRow[15]
        );


      const normalizedCaption =
        normalizeMatchText(
          igCaption
        );


      const hasUsableText =
        normalizedCaption !== '';


      /* =============================================
         CANDIDATES WITHIN 12 HOURS
      ============================================= */

      const candidates = [];


      facebookReels.forEach(
        fb => {

          if (
            usedFacebookIds.has(
              fb.id
            )
          ) {

            return;
          }


          const timeDiffMinutes =
            getMatchMinutesDifference(
              igDate,
              fb.date
            );


          if (
            timeDiffMinutes === null
            ||
            timeDiffMinutes > 720
          ) {

            return;
          }


          candidates.push({

            facebook:
              fb,

            timeDiffMinutes:
              timeDiffMinutes
          });
        }
      );


      if (
        !candidates.length
      ) {

        return;
      }


      let bestMatch =
        null;


      /* =============================================
         NORMAL TEXT MATCH
      ============================================= */

      if (
        hasUsableText
      ) {

        candidates.forEach(
          candidate => {

            const fb =
              candidate.facebook;


            const timeDiffMinutes =
              candidate.timeDiffMinutes;


            const captionSimilarity =
              matchTextSimilarity(
                igCaption,
                fb.caption
              );


            const titleSimilarity =
              matchTextSimilarity(
                igTitle,
                fb.title
              );


            let timeScore = 0;


            if (
              timeDiffMinutes <= 30
            ) {

              timeScore =
                1;

            } else if (
              timeDiffMinutes <= 120
            ) {

              timeScore =
                0.90;

            } else if (
              timeDiffMinutes <= 360
            ) {

              timeScore =
                0.70;

            } else {

              timeScore =
                0.40;
            }


            /*
              Score:

              Caption 75%
              Title   15%
              Time    10%
            */

            const totalScore =
              (
                captionSimilarity
                *
                0.75
              )
              +
              (
                titleSimilarity
                *
                0.15
              )
              +
              (
                timeScore
                *
                0.10
              );


            if (
              !bestMatch
              ||
              totalScore >
              bestMatch.totalScore
            ) {

              bestMatch = {

                facebook:
                  fb,

                captionSimilarity:
                  captionSimilarity,

                titleSimilarity:
                  titleSimilarity,

                timeDiffMinutes:
                  timeDiffMinutes,

                totalScore:
                  totalScore,

                method:
                  'Text'
              };
            }
          }
        );
      }


      /* =============================================
         MISSING CAPTION TIME FALLBACK

         فقط لو Caption مفقود تمامًا.
      ============================================= */

      if (
        !hasUsableText
      ) {

        const sortedByTime =
          candidates
            .slice()
            .sort(
              (a, b) =>
                a.timeDiffMinutes
                -
                b.timeDiffMinutes
            );


        const nearest =
          sortedByTime[0];


        const secondNearest =
          sortedByTime.length > 1
            ? sortedByTime[1]
            : null;


        /*
          شروط صارمة:

          1. Caption مفقود.
          2. أقرب FB Reel خلال 5 دقائق.
          3. مفيش FB Reel منافس قريب منه.

          لو فيه Candidate تاني،
          لازم يكون أبعد 10 دقائق على الأقل.
        */

        const nearestIsVeryClose =
          nearest
          &&
          nearest.timeDiffMinutes <= 5;


        const noAmbiguousSecondCandidate =
          !secondNearest
          ||
          (
            secondNearest.timeDiffMinutes
            -
            nearest.timeDiffMinutes
          ) >= 10;


        if (
          nearestIsVeryClose
          &&
          noAmbiguousSecondCandidate
        ) {

          bestMatch = {

            facebook:
              nearest.facebook,

            captionSimilarity:
              0,

            titleSimilarity:
              0,

            timeDiffMinutes:
              nearest.timeDiffMinutes,

            /*
              95 بدل 100 لأنه Match مبني على Time.
            */

            totalScore:
              0.95,

            method:
              'Time Fallback'
          };
        }
      }


      if (
        !bestMatch
      ) {

        return;
      }


      /* =============================================
         CONFIDENCE
      ============================================= */

      let confidence =
        'Low';


      if (
        bestMatch.method ===
        'Time Fallback'
      ) {

        confidence =
          'High';

      } else if (
        bestMatch.totalScore >= 0.90
        &&
        bestMatch.captionSimilarity >= 0.85
        &&
        bestMatch.timeDiffMinutes <= 360
      ) {

        confidence =
          'High';

      } else if (
        bestMatch.totalScore >= 0.80
        &&
        bestMatch.captionSimilarity >= 0.75
        &&
        bestMatch.timeDiffMinutes <= 720
      ) {

        confidence =
          'Medium';
      }


      const fb =
        bestMatch.facebook;


      const score100 =
        bestMatch.totalScore
        *
        100;


      /* =============================================
         WRITE AUDIT DATA
      ============================================= */

      igSheet
        .getRange(
          igSheetRow,
          MATCH_FB_ID_COL
        )
        .setNumberFormat(
          '@'
        )
        .setValue(
          fb.id
        );


      igSheet
        .getRange(
          igSheetRow,
          MATCH_CONF_COL
        )
        .setValue(
          confidence
        );


      igSheet
        .getRange(
          igSheetRow,
          MATCH_SCORE_COL
        )
        .setValue(
          score100
        );


      /* =============================================
         ONLY HIGH MATCHES TRANSFER DURATION
      ============================================= */

      if (
        confidence === 'High'
      ) {

        usedFacebookIds.add(
          fb.id
        );


        /*
          ننقل Video Duration فقط.

          لا يتم نقل:
          Views
          Reach
          Engagement
          Watch Time
          أو أي Performance Metric
          من Facebook إلى Instagram.
        */

        igSheet
          .getRange(
            igSheetRow,
            20
          )
          .setValue(
            fb.duration
          );


        if (
          bestMatch.method ===
          'Time Fallback'
        ) {

          igSheet
            .getRange(
              igSheetRow,
              DURATION_SOURCE_COL
            )
            .setValue(
              'Matched Facebook Reel (Time Fallback)'
            );

        } else {

          igSheet
            .getRange(
              igSheetRow,
              DURATION_SOURCE_COL
            )
            .setValue(
              'Matched Facebook Reel'
            );
        }


        /*
          Instagram Average % Watched

          =
          IG Avg Watch Time
          /
          Shared Video Duration
        */

        if (
          igAvgWatch > 0
          &&
          fb.duration > 0
        ) {

          const avgPercentWatched =
            igAvgWatch
            /
            fb.duration;


          igSheet
            .getRange(
              igSheetRow,
              21
            )
            .setValue(
              avgPercentWatched
            );
        }
      }
    }
  );


  /* =================================================
     MATCH FORMATTING
  ================================================= */

  const igRows =
    igLastRow - 1;


  igSheet
    .getRange(
      2,
      20,
      igRows,
      1
    )
    .setNumberFormat(
      '0.00'
    );


  igSheet
    .getRange(
      2,
      21,
      igRows,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  igSheet
    .getRange(
      2,
      MATCH_FB_ID_COL,
      igRows,
      1
    )
    .setNumberFormat(
      '@'
    );


  igSheet
    .getRange(
      2,
      MATCH_SCORE_COL,
      igRows,
      1
    )
    .setNumberFormat(
      '0.0'
    );


  console.log(
    'Instagram / Facebook Reel matching completed.'
  );
}



/* =====================================================
   9. SHEET SETUP
===================================================== */

function ensureRawSheet(
  ss,
  sheetName,
  headers,
  idColumn
) {

  let sheet =
    ss.getSheetByName(
      sheetName
    );


  if (
    !sheet
  ) {

    sheet =
      ss.insertSheet(
        sheetName
      );
  }


  /*
    Force ID column to Plain Text.
  */

  sheet
    .getRange(
      1,
      idColumn,
      sheet.getMaxRows(),
      1
    )
    .setNumberFormat(
      '@'
    );


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues(
      [headers]
    );


  sheet.setFrozenRows(
    1
  );


  const header =
    sheet.getRange(
      1,
      1,
      1,
      headers.length
    );


  header
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      '#FFFFFF'
    )
    .setBackground(
      '#0E3145'
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    )
    .setWrap(
      true
    );


  if (
    sheet.getMaxRows() > 1
  ) {

    sheet
      .getRange(
        2,
        idColumn,
        sheet.getMaxRows() - 1,
        1
      )
      .setNumberFormat(
        '@'
      );
  }


  return sheet;
}



/* =====================================================
   10. UPSERT
===================================================== */

function upsertRowsById(
  sheet,
  incomingRows,
  idColumn
) {

  if (
    !incomingRows.length
  ) {

    return;
  }


  sheet
    .getRange(
      2,
      idColumn,
      Math.max(
        sheet.getMaxRows() - 1,
        1
      ),
      1
    )
    .setNumberFormat(
      '@'
    );


  const lastRow =
    sheet.getLastRow();


  const existingMap =
    {};


  if (
    lastRow >= 2
  ) {

    const existingIds =
      sheet
        .getRange(
          2,
          idColumn,
          lastRow - 1,
          1
        )
        .getDisplayValues();


    existingIds.forEach(
      (row, index) => {

        const id =
          String(
            row[0] || ''
          ).trim();


        if (
          id
        ) {

          existingMap[id] =
            index + 2;
        }
      }
    );
  }


  const newRows = [];


  incomingRows.forEach(
    row => {

      const id =
        String(
          row[
            idColumn - 1
          ] || ''
        ).trim();


      if (
        !id
      ) {

        return;
      }


      row[
        idColumn - 1
      ] =
        id;


      if (
        existingMap[id]
      ) {

        const targetRow =
          existingMap[id];


        sheet
          .getRange(
            targetRow,
            idColumn
          )
          .setNumberFormat(
            '@'
          );


        sheet
          .getRange(
            targetRow,
            1,
            1,
            row.length
          )
          .setValues(
            [row]
          );

      } else {

        newRows.push(
          row
        );
      }
    }
  );


  if (
    newRows.length
  ) {

    const startRow =
      sheet.getLastRow()
      +
      1;


    sheet
      .getRange(
        startRow,
        idColumn,
        newRows.length,
        1
      )
      .setNumberFormat(
        '@'
      );


    sheet
      .getRange(
        startRow,
        1,
        newRows.length,
        newRows[0].length
      )
      .setValues(
        newRows
      );
  }


  /*
    Sort newest → oldest.

    مهم:
    بنعمل Sort لكل أعمدة الشيت،
    علشان Instagram W:Z تتحرك
    مع نفس الـrow.
  */

  if (
    sheet.getLastRow() > 2
  ) {

    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        sheet.getLastColumn()
      )
      .sort({
        column:
          1,

        ascending:
          false
      });
  }


  if (
    sheet.getLastRow() >= 2
  ) {

    sheet
      .getRange(
        2,
        idColumn,
        sheet.getLastRow() - 1,
        1
      )
      .setNumberFormat(
        '@'
      );
  }
}



/* =====================================================
   11. FACEBOOK FORMATTING
===================================================== */

function formatFacebookRaw(
  sheet
) {

  const rows =
    Math.max(
      sheet.getLastRow() - 1,
      1
    );


  sheet
    .getRange(
      2,
      2,
      rows,
      1
    )
    .setNumberFormat(
      '@'
    );


  sheet
    .getRange(
      2,
      1,
      rows,
      1
    )
    .setNumberFormat(
      'dd/mm/yyyy hh:mm'
    );


  sheet
    .getRange(
      2,
      7,
      rows,
      7
    )
    .setNumberFormat(
      '0'
    );


  sheet
    .getRange(
      2,
      14,
      rows,
      2
    )
    .setNumberFormat(
      '0.00'
    );


  sheet
    .getRange(
      2,
      16,
      rows,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      2,
      17,
      rows,
      1
    )
    .setNumberFormat(
      '0.00'
    );


  sheet
    .getRange(
      2,
      18,
      rows,
      2
    )
    .setNumberFormat(
      '0'
    );


  sheet
    .getRange(
      2,
      20,
      rows,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      2,
      21,
      rows,
      1
    )
    .setNumberFormat(
      'dd/mm/yyyy hh:mm'
    );


  sheet.setColumnWidth(
    4,
    280
  );


  sheet.setColumnWidth(
    5,
    400
  );


  sheet.setColumnWidth(
    6,
    260
  );


  sheet
    .getRange(
      2,
      5,
      rows,
      1
    )
    .setWrapStrategy(
      SpreadsheetApp
        .WrapStrategy
        .CLIP
    );
}



/* =====================================================
   12. INSTAGRAM FORMATTING
===================================================== */

function formatInstagramRaw(
  sheet
) {

  const rows =
    Math.max(
      sheet.getLastRow() - 1,
      1
    );


  sheet
    .getRange(
      2,
      2,
      rows,
      1
    )
    .setNumberFormat(
      '@'
    );


  sheet
    .getRange(
      2,
      1,
      rows,
      1
    )
    .setNumberFormat(
      'dd/mm/yyyy hh:mm'
    );


  sheet
    .getRange(
      2,
      8,
      rows,
      8
    )
    .setNumberFormat(
      '0'
    );


  sheet
    .getRange(
      2,
      16,
      rows,
      2
    )
    .setNumberFormat(
      '0.00'
    );


  sheet
    .getRange(
      2,
      18,
      rows,
      2
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      2,
      20,
      rows,
      1
    )
    .setNumberFormat(
      '0.00'
    );


  sheet
    .getRange(
      2,
      21,
      rows,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      2,
      22,
      rows,
      1
    )
    .setNumberFormat(
      'dd/mm/yyyy hh:mm'
    );


  sheet.setColumnWidth(
    5,
    280
  );


  sheet.setColumnWidth(
    6,
    400
  );


  sheet.setColumnWidth(
    7,
    260
  );


  sheet
    .getRange(
      2,
      6,
      rows,
      1
    )
    .setWrapStrategy(
      SpreadsheetApp
        .WrapStrategy
        .CLIP
    );
}



/* =====================================================
   13. META API
===================================================== */

function metaGet(
  path,
  params = {}
) {

  const rawToken =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        'META_PAGE_TOKEN'
      );


  /*
    Trim يحمي من مسافة أو Enter
    اتاخد بالغلط مع الـToken.
  */

  const token =
    rawToken
      ? rawToken.trim()
      : '';


  if (
    !token
  ) {

    throw new Error(
      'META_PAGE_TOKEN غير موجود في Script Properties'
    );
  }


  const query = {

    ...params,

    access_token:
      token
  };


  const queryString =
    Object
      .keys(
        query
      )
      .map(
        key =>
          encodeURIComponent(
            key
          )
          +
          '='
          +
          encodeURIComponent(
            query[key]
          )
      )
      .join(
        '&'
      );


  const url =
    `https://graph.facebook.com/`
    +
    `${META_API_VERSION}/${path}?${queryString}`;


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'get',

        muteHttpExceptions:
          true
      }
    );


  const text =
    response
      .getContentText();


  let data;


  try {

    data =
      JSON.parse(
        text
      );

  } catch (error) {

    throw new Error(
      `Meta returned invalid JSON: ${text}`
    );
  }


  if (
    data.error
  ) {

    throw new Error(
      `${path} → ${data.error.message}`
    );
  }


  return data;
}



/* =====================================================
   14. INSIGHTS
===================================================== */

function getInsights(
  objectId,
  metrics
) {

  const result =
    metaGet(
      `${objectId}/insights`,
      {
        metric:
          metrics.join(
            ','
          )
      }
    );


  return (
    result.data
    ||
    []
  );
}


function safeGetInsights(
  objectId,
  metrics
) {

  try {

    return getInsights(
      objectId,
      metrics
    );

  } catch (error) {

    console.log(
      `Insights error ${objectId}: ${error.message}`
    );


    return [];
  }
}


function getInsightValue(
  insights,
  metric
) {

  /*
    First preference:
    lifetime.
  */

  let item =
    insights.find(
      x =>
        x.name === metric
        &&
        x.period === 'lifetime'
    );


  /*
    Fallback:
    metric name only.

    مهم لبعض Instagram metrics
    لو Meta رجعت period مختلف.
  */

  if (
    !item
  ) {

    item =
      insights.find(
        x =>
          x.name === metric
      );
  }


  if (
    !item
  ) {

    return '';
  }


  /*
    بعض endpoints ممكن ترجع total_value.
  */

  if (
    item.total_value
    &&
    item.total_value.value !== undefined
  ) {

    return item
      .total_value
      .value;
  }


  if (
    item.values
    &&
    item.values.length
  ) {

    return item
      .values[0]
      .value;
  }


  return '';
}



/* =====================================================
   15. CONTENT TITLE
===================================================== */

function makeContentTitle(
  message
) {

  if (
    !message
  ) {

    return (
      'Untitled Content'
    );
  }


  const lines =
    String(
      message
    )
      .split(
        /\r?\n/
      )
      .map(
        line =>
          line.trim()
      )
      .filter(
        line =>
          line !== ''
      );


  let title =
    lines.length
      ? lines[0]
      : String(
          message
        ).trim();


  title =
    title.replace(
      /\s+/g,
      ' '
    );


  if (
    title.length > 80
  ) {

    title =
      title.substring(
        0,
        80
      )
      +
      '...';
  }


  return title;
}



/* =====================================================
   16. MATCH TEXT NORMALIZATION
===================================================== */

function normalizeMatchText(
  text
) {

  if (
    !text
  ) {

    return '';
  }


  let value =
    String(
      text
    ).toLowerCase();


  /*
    Arabic normalization.
  */

  value =
    value
      .replace(
        /[أإآ]/g,
        'ا'
      )
      .replace(
        /ى/g,
        'ي'
      )
      .replace(
        /ؤ/g,
        'و'
      )
      .replace(
        /ئ/g,
        'ي'
      )
      .replace(
        /ـ/g,
        ''
      )
      .replace(
        /[\u064B-\u065F\u0670]/g,
        ''
      );


  /*
    Remove punctuation / emoji
    while keeping Arabic + English + numbers.
  */

  value =
    value.replace(
      /[^a-z0-9\u0600-\u06FF]+/g,
      ' '
    );


  value =
    value
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  return value;
}



/* =====================================================
   17. TEXT SIMILARITY
===================================================== */

function matchTextSimilarity(
  textA,
  textB
) {

  const a =
    normalizeMatchText(
      textA
    );


  const b =
    normalizeMatchText(
      textB
    );


  if (
    !a
    ||
    !b
  ) {

    return 0;
  }


  if (
    a === b
  ) {

    return 1;
  }


  const tokensA =
    new Set(
      a.split(
        ' '
      )
    );


  const tokensB =
    new Set(
      b.split(
        ' '
      )
    );


  let intersection =
    0;


  tokensA.forEach(
    token => {

      if (
        tokensB.has(
          token
        )
      ) {

        intersection++;
      }
    }
  );


  const union =
    new Set([
      ...tokensA,
      ...tokensB
    ]).size;


  if (
    !union
  ) {

    return 0;
  }


  return (
    intersection
    /
    union
  );
}



/* =====================================================
   18. TIME DIFFERENCE
===================================================== */

function getMatchMinutesDifference(
  dateA,
  dateB
) {

  const a =
    new Date(
      dateA
    );


  const b =
    new Date(
      dateB
    );


  if (
    isNaN(
      a.getTime()
    )
    ||
    isNaN(
      b.getTime()
    )
  ) {

    return null;
  }


  return (
    Math.abs(
      a.getTime()
      -
      b.getTime()
    )
    /
    60000
  );
}



/* =====================================================
   19. SAFE NUMBER
===================================================== */

function safeMatchNumber(
  value
) {

  if (
    value === ''
    ||
    value === null
    ||
    value === undefined
  ) {

    return 0;
  }


  if (
    typeof value === 'number'
  ) {

    return (
      isNaN(
        value
      )
        ? 0
        : value
    );
  }


  const normalized =
    String(
      value
    )
      .replace(
        /٫/g,
        '.'
      )
      .replace(
        /٬/g,
        ''
      )
      .trim();


  const number =
    Number(
      normalized
    );


  if (
    isNaN(
      number
    )
  ) {

    return 0;
  }


  return number;
}

function TEST_facebookReachComparison() {

  const token = String(
    PropertiesService
      .getScriptProperties()
      .getProperty('META_PAGE_TOKEN') || ''
  ).trim();

  if (!token) {
    throw new Error('META_PAGE_TOKEN غير موجود');
  }

  const pageId = '112261600179406';

  const months = [
    {
      month: '2026-06',
      endDate: '2026-06-30',
      manualReach: 1254246
    },
    {
      month: '2026-07',
      endDate: '2026-07-31',
      manualReach: 1162731
    },
    {
      month: '2026-08',
      endDate: '2026-08-31',
      manualReach: 1233838
    },
    {
      month: '2026-09',
      endDate: '2026-09-23',
      manualReach: null
    }
  ];

  const results = months.map(function(item) {

    const legacyReach =
      TEST_getFacebook28DayMetric_(
        'v24.0',
        pageId,
        token,
        'page_impressions_unique',
        item.endDate
      );

    const uniqueMediaViewers =
      TEST_getFacebook28DayMetric_(
        'v26.0',
        pageId,
        token,
        'page_total_media_view_unique',
        item.endDate
      );

    return {
      month: item.month,
      periodEnding: item.endDate,
      businessSuiteManualReach: item.manualReach,

      apiReach28D: legacyReach.value,
      apiReachEndTime: legacyReach.endTime,
      apiReachError: legacyReach.error,

      uniqueMediaViewers28D:
        uniqueMediaViewers.value,

      uniqueMediaViewersEndTime:
        uniqueMediaViewers.endTime,

      uniqueMediaViewersError:
        uniqueMediaViewers.error
    };
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        note: 'Both API metrics use rolling 28-day periods ending on the selected date.',
        results: results
      },
      null,
      2
    )
  );

  return results;
}


function TEST_getFacebook28DayMetric_(
  version,
  pageId,
  token,
  metric,
  endDateText
) {

  const endDate =
    new Date(endDateText + 'T12:00:00+03:00');

  const sinceDate =
    new Date(endDate);

  sinceDate.setDate(
    sinceDate.getDate() - 2
  );

  const untilDate =
    new Date(endDate);

  untilDate.setDate(
    untilDate.getDate() + 1
  );

  const since =
    Utilities.formatDate(
      sinceDate,
      'Africa/Cairo',
      'yyyy-MM-dd'
    );

  const until =
    Utilities.formatDate(
      untilDate,
      'Africa/Cairo',
      'yyyy-MM-dd'
    );

  const params = {
    metric: metric,
    period: 'days_28',
    since: since,
    until: until,
    access_token: token
  };

  const query = Object.keys(params)
    .map(function(key) {
      return (
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(params[key])
      );
    })
    .join('&');

  const url =
    'https://graph.facebook.com/' +
    version +
    '/' +
    pageId +
    '/insights?' +
    query;

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'get',
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  let body;

  try {
    body = JSON.parse(
      response.getContentText()
    );
  } catch (error) {
    return {
      value: null,
      endTime: null,
      error: 'Invalid JSON — HTTP ' + status
    };
  }

  if (body.error) {
    return {
      value: null,
      endTime: null,
      error:
        'HTTP ' +
        status +
        ': ' +
        body.error.message
    };
  }

  const metricData =
    body.data &&
    body.data.length
      ? body.data[0]
      : null;

  const values =
    metricData &&
    Array.isArray(metricData.values)
      ? metricData.values
      : [];

  const numericValues =
    values.filter(function(row) {
      return (
        row &&
        row.value !== null &&
        row.value !== undefined &&
        !isNaN(Number(row.value))
      );
    });

  if (!numericValues.length) {
    return {
      value: null,
      endTime: null,
      error: 'No numeric values returned'
    };
  }

  const selected =
    numericValues[
      numericValues.length - 1
    ];

  return {
    value: Number(selected.value),
    endTime: selected.end_time || null,
    error: null
  };
}


