rules_version = '2'
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions (no semicolons, valid rules syntax)
    function isAuthenticated() {
      return request.auth != null
    }
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid
    }
    function isTeacher() {
      return isAuthenticated() && request.auth.token.role == 'teacher'
    }
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true
    }

    // user favorites
    match /userFavorites/{userId}/recipes/{docId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId
    }

    // assigned recipes (students/teachers/admins)
    match /assignedRecipes/{docId} {
      allow read: if isAuthenticated() && (request.auth.token.student == true || request.auth.token.role == 'teacher' || request.auth.token.admin == true)
      allow write: if isAuthenticated() && (request.auth.token.role == 'teacher' || request.auth.token.admin == true)
    }

    // daily cookbook (guard get with exists)
    match /cookbook/dailyRecipe {
      allow read: if isAuthenticated() && !(exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.blockedCookbook == true)
      allow write: if isAuthenticated() && request.auth.token.service == true
    }

    // users top-level and nested collections (single consolidated match)
    match /users/{userId} {
      allow read, create, update: if isOwner(userId)

      match /survey_limits/{rateDoc} {
        allow read, write: if isOwner(userId)
      }

      match /projects/{projectId} {
        allow read, list: if isOwner(userId) || isAdmin()
        allow create: if (isOwner(userId) || isAdmin()) && validProject(request.resource.data)
        allow update: if (isOwner(userId) || isAdmin()) && validProject(request.resource.data)
        allow delete: if isOwner(userId) || isAdmin()
      }

      match /settings/{settingId} {
        allow read, write: if isOwner(userId) || isAdmin()
      }

      match /surveys/{surveyId} {
        allow create: if isAuthenticated() && request.auth.uid == userId
        allow read, update, delete: if false
      }
    }

    // COMMUNITY FORUM
    match /artifacts/{appId}/public/data/forum_posts/{postId} {
      allow read: if true
      allow create: if isAuthenticated()

      allow update: if isOwner(resource.data.userId) || isTeacher()
                    || (isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['voteCount','commentsDisabled']))

      allow delete: if isOwner(resource.data.userId) || isTeacher()

      match /comments/{commentId} {
        allow read, write: if isAuthenticated()
      }

      match /votes/{userId} {
        allow read: if true
        allow write: if isAuthenticated() && request.auth.uid == userId
      }
    }

    // ARTIFACT USER PROFILES (public)
    match /artifacts/{appId}/public/data/user_profiles/{profileUserId} {
      allow read: if true
      allow create: if isOwner(profileUserId)

      allow update: if (
        (isOwner(profileUserId) && (!('followersCount' in request.resource.data) || request.resource.data.followersCount == resource.data.followersCount))
        || (isAuthenticated() && !isOwner(profileUserId) && request.resource.data.keys().hasOnly(['followersCount']))
      )
    }

    // GLOBAL USER PROFILES
    match /user_profiles/{profileUserId} {
      allow read: if true
      allow create, update: if isOwner(profileUserId)
    }

    match /user_profiles/{profileUserId}/following/{targetUserId} {
      allow read: if true
      allow create, delete: if isOwner(profileUserId)
    }

    match /user_profiles/{targetUserId}/followers/{userId} {
      allow read: if true
      allow create, delete: if false
    }

    // TEACHER DASHBOARD: assignments & classes
    match /assignments/{assignmentId} {
      allow get: if isAuthenticated() && (resource.data.studentId == request.auth.uid || resource.data.teacherId == request.auth.uid)
      allow create: if isTeacher() && request.resource.data.teacherId == request.auth.uid
      allow update, delete: if isTeacher() && resource.data.teacherId == request.auth.uid
    }

    match /classes/{classId} {
      allow get, list: if isAuthenticated()
      allow create: if isTeacher() && request.resource.data.teacherId == request.auth.uid
      allow update, delete: if isTeacher() && resource.data.teacherId == request.auth.uid
    }

    // QUIZZES / LEADERBOARD
    match /quizzes/{quizId} {
      allow read: if true
      allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid
      allow update, delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid
    }

    match /leaderboard/{entryId} {
      allow read: if true
      allow create, update: if isAuthenticated()
    }

    // SURVEYS (global)
    match /surveys/{surveyId} {
      allow create: if true
      allow read, update, delete: if false
    }

    // NOTIFICATIONS
    match /notifications/{notificationId} {
      allow create: if isAuthenticated()
      allow read, update: if isOwner(resource.data.recipientUid)
      allow delete: if false
    }

    // Project validation helper
    function validProject(data) {
      return data.keys().hasAll(['filename','content','ts'])
             && data.filename is string
             && data.content is string
             && data.ts is int
             && (!('category' in data) || data.category is string)
             && (!('source' in data) || data.source is string)
    }

    // DEFAULT DENY
    match /{document=**} {
      allow read, write: if false
    }
  }
}
