/**
 * READ-ONLY diagnostic for per-content Reach and Follows.
 *
 * Requirements:
 * - Keep this file in the same Apps Script project as Meta_Sync_CLEAN.gs.
 * - Uses the existing metaGet(), getInsights(), getInsightValue(),
 *   FACEBOOK_PAGE_ID and INSTAGRAM_ACCOUNT_ID.
 *
 * This test does not write to Sheets and does not modify dashboard data.
 */
function TEST_META_CONTENT_REACH_FOLLOWS() {
  const result = {
    success: true,
    readOnly: true,
    testedAt: new Date().toISOString(),
    facebook: TEST_META_latestFacebookContent_(3),
    instagram: TEST_META_latestInstagramContent_(3)
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}


function TEST_META_latestFacebookContent_(limit) {
  const response = metaGet(
    `${FACEBOOK_PAGE_ID}/posts`,
    {
      fields: 'id,message,created_time,permalink_url',
      limit: limit
    }
  );

  return (response.data || []).map(post => ({
    id: String(post.id || ''),
    date: post.created_time || '',
    title: TEST_META_shortText_(post.message || ''),
    link: post.permalink_url || '',

    // Reach candidate used by older Page Post Insights versions.
    reach: TEST_META_oneMetric_(post.id, 'post_impressions_unique'),

    // Already used by the production sync; this is Unique Media Viewers,
    // not automatically treated as Reach.
    uniqueMediaViewers: TEST_META_oneMetric_(
      post.id,
      'post_total_media_view_unique'
    ),

    // Diagnostic candidates only. Unsupported names will return an error
    // without stopping the rest of the test.
    follows: TEST_META_firstSupportedMetric_(
      post.id,
      ['post_follows', 'post_followers_gained']
    )
  }));
}


function TEST_META_latestInstagramContent_(limit) {
  const response = metaGet(
    `${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      fields:
        'id,caption,media_type,media_product_type,timestamp,permalink',
      limit: limit
    }
  );

  return (response.data || []).map(media => ({
    id: String(media.id || ''),
    date: media.timestamp || '',
    type: media.media_product_type || media.media_type || '',
    title: TEST_META_shortText_(media.caption || ''),
    link: media.permalink || '',
    reach: TEST_META_oneMetric_(media.id, 'reach'),
    follows: TEST_META_oneMetric_(media.id, 'follows'),
    profileActivity: TEST_META_oneMetric_(media.id, 'profile_activity'),
    profileVisits: TEST_META_oneMetric_(media.id, 'profile_visits')
  }));
}


function TEST_META_oneMetric_(objectId, metric) {
  try {
    const insights = getInsights(objectId, [metric]);
    const found = (insights || []).some(item => item.name === metric);

    return {
      metric: metric,
      supported: found,
      value: found ? getInsightValue(insights, metric) : null,
      error: null
    };
  } catch (error) {
    return {
      metric: metric,
      supported: false,
      value: null,
      error: String(error && error.message ? error.message : error)
    };
  }
}


function TEST_META_firstSupportedMetric_(objectId, metrics) {
  const attempts = metrics.map(metric =>
    TEST_META_oneMetric_(objectId, metric)
  );

  const supported = attempts.find(attempt => attempt.supported);

  return {
    supported: Boolean(supported),
    metric: supported ? supported.metric : null,
    value: supported ? supported.value : null,
    attempts: attempts
  };
}


function TEST_META_shortText_(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
}
