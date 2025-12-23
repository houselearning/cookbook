// Web app to receive POSTs and append to Sheets (publish as Execute API / Web app)
const SHEET_ID = '1H9DBZKlsM1ic4BweECsfAx02x8SW_rsYRtod-T5SzfA';
const SECRET_TOKEN = 'OPTIONAL_SECRET';

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    // optional token check: if (params.token !== SECRET_TOKEN) return ContentService.createTextOutput('Unauthorized');
    const action = e.parameter.action || params.type;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'like') {
      const sh = ss.getSheetByName('Likes') || ss.insertSheet('Likes');
      sh.appendRow([new Date(), params.userId, params.recipeId, params.timestamp]);
    } else if (action === 'rating' || action === 'rating') {
      const sh = ss.getSheetByName('Ratings') || ss.insertSheet('Ratings');
      sh.appendRow([new Date(), params.userId, params.recipeId, params.rating, params.comment || '', params.timestamp]);
    } else if (action === 'report' || params.type === 'report') {
      const sh = ss.getSheetByName('Reports') || ss.insertSheet('Reports');
      // increment report count for user/ip in a separate sheet to enforce bans
      sh.appendRow([new Date(), params.userId, params.recipeId, params.reason, params.ip || 'unknown', params.timestamp]);
      // moderation: update bans sheet (simple example)
      const bans = ss.getSheetByName('Bans') || ss.insertSheet('Bans');
      // implement ban logic server-side or here by counting rows per userId
      // ...existing code...
    }
    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}