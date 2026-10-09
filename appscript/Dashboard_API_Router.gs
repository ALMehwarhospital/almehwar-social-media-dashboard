/**
 * Keep one global web-app router in the Apps Script project.
 * Replace the existing doGet block in Dashboard_API with this block and add
 * doPost beside it. Existing website and TikTok routes remain unchanged.
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  if (params.code || params.error) return TIKTOK_doGet_(e);
  if (params.section) return SOCIAL_DASH_API_doGet_(e);
  return DASHBOARD_API_doGet_(e);
}

function doPost(e) {
  return SOCIAL_DASH_API_doPost_(e);
}
