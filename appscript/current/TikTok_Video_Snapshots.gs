function TIKTOK_importVideoSnapshot() {
  const props = PropertiesService.getScriptProperties();

  try {
    if (typeof TIKTOK_refreshAccessToken === 'function') {
      TIKTOK_refreshAccessToken();
    }
  } catch (error) {
    console.log(
      'TikTok token refresh before video snapshot: ' + error.message
    );
  }

  const token = props.getProperty('TIKTOK_ACCESS_TOKEN');
  if (!token) throw new Error('Access Token غير موجود.');

  const fields = [
    'id', 'create_time', 'title', 'share_url', 'duration',
    'view_count', 'like_count', 'comment_count', 'share_count'
  ].join(',');

  const videos = new Map();
  const seenCursors = new Set();
  let cursor;
  let complete = false;

  // نجمع النتائج كاملة قبل الكتابة في الشيت.
  for (let page = 0; page < 100; page++) {
    const body = { max_count: 20 };
    if (cursor !== undefined) body.cursor = cursor;

    const response = UrlFetchApp.fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=' +
      encodeURIComponent(fields),
      {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify(body),
        muteHttpExceptions: true
      }
    );

    let result;
    try {
      result = JSON.parse(response.getContentText());
    } catch (_) {
      throw new Error('رد غير متوقع. HTTP ' + response.getResponseCode());
    }

    if (
      response.getResponseCode() !== 200 ||
      result.error?.code !== 'ok' ||
      !Array.isArray(result.data?.videos)
    ) {
      throw new Error(
        'TikTok: ' + (result.error?.code || 'unknown') +
        ' — ' + (result.error?.message || 'No video data')
      );
    }

    result.data.videos.forEach(video => {
      videos.set(String(video.id), video);
    });

    if (!result.data.has_more) {
      complete = true;
      break;
    }

    cursor = result.data.cursor;
    if (cursor == null || seenCursors.has(String(cursor))) {
      throw new Error('تعذّر استكمال الصفحات؛ لم تتم الكتابة.');
    }
    seenCursors.add(String(cursor));
  }

  if (!complete) throw new Error('لم يكتمل السحب؛ لم تتم الكتابة.');
  if (!videos.size) throw new Error('لم يرجع API فيديوهات؛ لم تتم الكتابة.');

  const book = SpreadsheetApp.openById(
    '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8'
  );

  const headers = [
    'Snapshot At (Cairo)', 'Video ID', 'Published At (Cairo)',
    'Title', 'URL', 'Duration Seconds', 'Lifetime Views',
    'Lifetime Likes', 'Lifetime Comments', 'Lifetime Shares',
    'Engagement Rate', 'Data Source'
  ];

  const timestamp = Utilities.formatDate(
    new Date(), 'Africa/Cairo', 'yyyy-MM-dd HH:mm:ss'
  );

  const rows = Array.from(videos.values()).map(v => {
    const hasMetrics = [
      v.view_count, v.like_count, v.comment_count, v.share_count
    ].every(n => typeof n === 'number');

    const rate = hasMetrics && v.view_count > 0
      ? (v.like_count + v.comment_count + v.share_count) / v.view_count
      : '';

    return [
      timestamp,
      "'" + String(v.id),
      v.create_time
        ? Utilities.formatDate(
            new Date(v.create_time * 1000),
            'Africa/Cairo', 'yyyy-MM-dd HH:mm:ss'
          )
        : '',
      "'" + String(v.title || ''),
      v.share_url || '',
      v.duration ?? '',
      v.view_count ?? '',
      v.like_count ?? '',
      v.comment_count ?? '',
      v.share_count ?? '',
      rate,
      'TikTok API — cumulative video snapshot'
    ];
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = book.getSheetByName('TikTok Video Snapshots') ||
      book.insertSheet('TikTok Video Snapshots');

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#16324F').setFontColor('#FFFFFF')
        .setFontWeight('bold');
    } else {
      const existing = sheet.getRange(1, 1, 1, headers.length)
        .getValues()[0];
      if (JSON.stringify(existing) !== JSON.stringify(headers)) {
        throw new Error('أعمدة التبويب مختلفة؛ لم تتم الكتابة.');
      }
    }

    const start = sheet.getLastRow() + 1;
    const needed = start + rows.length - 1;
    if (needed > sheet.getMaxRows()) {
      sheet.insertRowsAfter(
        sheet.getMaxRows(), needed - sheet.getMaxRows()
      );
    }

    sheet.getRange(start, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(start, 11, rows.length, 1).setNumberFormat('0.00%');
    SpreadsheetApp.flush();

    console.log('تم حفظ ' + rows.length + ' فيديو في TikTok Video Snapshots.');
    console.log('تاريخ اللقطة: ' + timestamp);
  } finally {
    lock.releaseLock();
  }
}
