rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read: if true;

      allow create: if isValidOrderCreate(request.resource.data);
      allow update: if isValidOrderUpdate(request.resource.data);
    }

    function isValidOrderCreate(data) {
      return data.keys().hasOnly([
        'billNo',
        'tableNo',
        'hostessName',
        'guestName',
        'notes',
        'imageUrl',
        'rawText',
        'readingText',
        'items',
        'ocrStatus',
        'completed',
        'softDeleted',
        'createdAt',
        'updatedAt',
        'createdAtMs',
        'alertPhrase'
      ])
      && data.createdAtMs is int
      && data.completed is bool
      && data.softDeleted is bool
      && data.billNo is string
      && data.tableNo is string
      && data.hostessName is string
      && data.guestName is string
      && data.notes is string
      && data.rawText is string
      && data.readingText is string
      && data.ocrStatus is string
      && data.alertPhrase is string
      && data.items is list;
    }

    function isValidOrderUpdate(data) {
      return data.keys().hasOnly([
        'billNo',
        'tableNo',
        'hostessName',
        'guestName',
        'notes',
        'imageUrl',
        'rawText',
        'readingText',
        'items',
        'ocrStatus',
        'completed',
        'softDeleted',
        'createdAt',
        'updatedAt',
        'createdAtMs',
        'alertPhrase'
      ])
      && data.createdAtMs is int
      && data.completed is bool
      && data.softDeleted is bool
      && data.billNo is string
      && data.tableNo is string
      && data.hostessName is string
      && data.guestName is string
      && data.notes is string
      && data.rawText is string
      && data.readingText is string
      && data.ocrStatus is string
      && data.alertPhrase is string
      && data.items is list;
    }
  }
}
