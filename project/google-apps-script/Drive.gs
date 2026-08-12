/** عمليات Google Drive الاختيارية. لا تُستدعى إلا بعد إعداد DRIVE_FOLDER_ID. */

var DriveFiles = {
  upload: function (blob, fileName, mimeType) {
    var folderId = getDriveFolderId();
    if (!folderId) throw new Error('لم يتم إعداد DRIVE_FOLDER_ID.');
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob).setName(fileName);
    if (mimeType) file.setMimeType(mimeType);
    return { id: file.getId(), name: file.getName(), url: file.getUrl(), mimeType: file.getMimeType() };
  },

  getMetadata: function (fileId) {
    var file = DriveApp.getFileById(fileId);
    return { id: file.getId(), name: file.getName(), url: file.getUrl(), mimeType: file.getMimeType() };
  },
};
