# Security Specifications: Global News Pro

## 1. Data Invariants
- **Public Articles**: News articles must be readable by any user (authenticated or unauthenticated).
- **Admin Isolation**: Only designated admin users (`aki.sokpah.link@gmail.com`, `luckyglobalnews@gmail.com`, or accounts in `/admins/`) can CRUD articles. No other user can create, update, or delete articles (except updating `likesCount` or `viewsCount` via specific operations).
- **Preference Isolation**: User personalization categories and saved article lists are completely private. Only the respective owner can read or write their `/user_preferences/{userId}` document.
- **Strict Keys & Size Checking**: Article titles are limited to 200 characters, contents to 100,000 characters, and IDs are checked against injection-safety patterns.

## 2. The "Dirty Dozen" Attacker Payloads
1. **Unauthenticated Article Creation**: An anonymous user attempts to post an article.
2. **Standard User Privilege Escalation**: A standard subscriber user tries to write to the `articles` collection.
3. **Malicious ID Poisoning**: An attacker tries to write to `/articles/injection-path-../../etc` with unsafe characters.
4. **Massive Content Overflow**: Attacker attempts to upload a 5MB text block into an article content field.
5. **Self-Assigned Admin Status**: A client attempts to write a document to `/admins/{any_id}` to make themselves an editor.
6. **Self-Like Spamming**: An attacker attempts to write a `likes/{userId}` subdocument using another user's `userId`.
7. **Cross-User Preference Sniffing**: User `A` attempts to fetch `/user_preferences/userB` to see what topics user `B` follows.
8. **Shadow Field Attack**: Writing an article with random ghost fields like `isFeaturedPromo: true`.
9. **Creation Timestamp Spoofing**: Creating an article but overriding `publishedAt` with a historical date.
10. **State Shortcutting**: Bypassing view counting rules by resetting likes or views directly on the article document.
11. **Improper ID Verification**: Injecting a 2KB junk string as the user ID in preference collection.
12. **PII Reading**: General users attempting to access administrative user sheets or list email profiles.

## 3. Test Cases (firestore.rules.test.ts description)
The `firestore.rules.test.ts` acts as our structural unit test confirming that each of the "Dirty Dozen" payloads return `PERMISSION_DENIED` when attempted by unauthorized roles, ensuring zero update gap exploits.
