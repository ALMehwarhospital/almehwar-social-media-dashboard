function META_ADS_TEST_POST_LINKS() {
  const props = PropertiesService.getScriptProperties();

  // لو عملنا Ads Token مخصوص بعدين هياخده أولًا.
  // حاليًا هيجرب META_PAGE_TOKEN الموجود.
  const token =
    props.getProperty('META_ADS_ACCESS_TOKEN') ||
    props.getProperty('META_PAGE_TOKEN');

  const version =
    props.getProperty('META_GRAPH_VERSION') ||
    'v26.0';

  if (!token) {
    throw new Error(
      'META_PAGE_TOKEN أو META_ADS_ACCESS_TOKEN غير موجود في Script Properties'
    );
  }

  Logger.log('========================================');
  Logger.log('META ADS READ-ONLY TEST');
  Logger.log('========================================');

  // 1) اختبار هل التوكن يقدر يشوف حسابات الإعلانات
  const accountsResponse = META_ADS_TEST_GET_(
    'me/adaccounts',
    {
      fields: 'id,name,account_status,currency,timezone_name',
      limit: 50
    },
    token,
    version
  );

  const accounts = accountsResponse.data || [];

  Logger.log('Ad accounts found: ' + accounts.length);
  Logger.log(JSON.stringify(accounts, null, 2));

  if (!accounts.length) {
    throw new Error(
      'التوكن شغال، لكنه لا يعرض أي Ad Account. غالبًا نحتاج User/System User Token بصلاحية ads_read.'
    );
  }

  // يحاول اختيار حساب المحور تلقائيًا
  let selectedAccount = accounts.find(function (account) {
    const name = String(account.name || '').toLowerCase();
    return (
      name.indexOf('mehwar') !== -1 ||
      name.indexOf('almehwar') !== -1 ||
      name.indexOf('محور') !== -1
    );
  });

  if (!selectedAccount && accounts.length === 1) {
    selectedAccount = accounts[0];
  }

  if (!selectedAccount) {
    throw new Error(
      'ظهر أكثر من Ad Account ولم أستطع تحديد حساب المحور. انسخ نتيجة Execution Log وابعتها لي.'
    );
  }

  Logger.log('Selected account:');
  Logger.log(JSON.stringify(selectedAccount, null, 2));

  // 2) سحب أول 50 إعلان مع حلقة الربط بالبوست
  const adsResponse = META_ADS_TEST_GET_(
    selectedAccount.id + '/ads',
    {
      fields: [
        'id',
        'name',
        'campaign_id',
        'adset_id',
        'effective_status',
        'creative{id,name,object_story_id,effective_object_story_id}'
      ].join(','),
      limit: 50
    },
    token,
    version
  );

  const ads = adsResponse.data || [];

  const simplified = ads.map(function (ad) {
    const creative = ad.creative || {};

    return {
      adId: ad.id || null,
      adName: ad.name || null,
      campaignId: ad.campaign_id || null,
      adSetId: ad.adset_id || null,
      status: ad.effective_status || null,

      creativeId: creative.id || null,
      creativeName: creative.name || null,

      postId: creative.object_story_id || null,
      effectivePostId: creative.effective_object_story_id || null
    };
  });

  const linked = simplified.filter(function (ad) {
    return ad.postId || ad.effectivePostId;
  });

  Logger.log('Ads fetched: ' + simplified.length);
  Logger.log('Ads linked to posts: ' + linked.length);

  Logger.log('========================================');
  Logger.log('ADS + POST IDS');
  Logger.log('========================================');
  Logger.log(JSON.stringify(simplified, null, 2));

  Logger.log('========================================');
  Logger.log('TEST COMPLETED');
  Logger.log('========================================');

  return {
    success: true,
    readOnly: true,
    account: selectedAccount,
    adsFetched: simplified.length,
    adsLinkedToPosts: linked.length,
    ads: simplified
  };
}


function META_ADS_TEST_GET_(path, params, token, version) {
  const query = Object.keys(params || {})
    .map(function (key) {
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
    path +
    '?' +
    query;

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  Logger.log('HTTP ' + status + ' → ' + path);

  let json;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error('Meta returned invalid JSON: ' + text);
  }

  if (status < 200 || status >= 300 || json.error) {
    throw new Error(
      'Meta API Error → ' +
      JSON.stringify(json.error || json)
    );
  }

  return json;
}