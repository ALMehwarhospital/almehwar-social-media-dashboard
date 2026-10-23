/**
 * WEBSITE TABS MANAGER
 * يخفي شيتات الويب سايت بدون حذفها أو تغيير أسمائها
 */

function hideWebsiteTabs() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // أسماء شيتات الويب سايت
  const websiteSheets = [
    'Website Raw',
    'Website Traffic Raw',
    'Website Sources Raw',
    'Website Pages Raw',
    'Website Conversions Raw',
    'Search Console Raw',
    'Search Console Overview Raw'
  ];

  let hiddenCount = 0;

  websiteSheets.forEach(function(sheetName) {

    const sheet = ss.getSheetByName(sheetName);

    if (sheet && !sheet.isSheetHidden()) {
      sheet.hideSheet();
      hiddenCount++;
    }

  });

  SpreadsheetApp.getUi().alert(
    'Done ✅\n' +
    hiddenCount + ' Website sheets have been hidden.\n\n' +
    'All data and integrations are still working normally.'
  );
}


/**
 * لو عايز ترجع كل Website Tabs مرة واحدة
 */
function showWebsiteTabs() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const websiteSheets = [
    'Website Raw',
    'Website Traffic Raw',
    'Website Sources Raw',
    'Website Pages Raw',
    'Website Conversions Raw',
    'Search Console Raw',
    'Search Console Overview Raw'
  ];

  let shownCount = 0;

  websiteSheets.forEach(function(sheetName) {

    const sheet = ss.getSheetByName(sheetName);

    if (sheet && sheet.isSheetHidden()) {
      sheet.showSheet();
      shownCount++;
    }

  });

  SpreadsheetApp.getUi().alert(
    'Done ✅\n' +
    shownCount + ' Website sheets are now visible.'
  );
}