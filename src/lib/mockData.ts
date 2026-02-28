// Mock data for the Japanese learning platform

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  avatarUrl: string;
  streak: number;
  totalWords: number;
  totalQuizzes: number;
  avgScore: number;
  badges: string[];
  createdAt: string;
  status: 'active' | 'banned';
}

export interface FlashcardDeck {
  id: number;
  ownerId: number;
  ownerName: string;
  title: string;
  description: string;
  isPublic: boolean;
  jlptLevel: string;
  cardCount: number;
  createdAt: string;
}

export interface Flashcard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  example: string;
  learned: boolean;
}

export interface Quiz {
  id: number;
  creatorId: number;
  creatorName: string;
  title: string;
  description: string;
  questionCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

export interface Material {
  id: number;
  uploaderId: number;
  uploaderName: string;
  title: string;
  course: string;
  tags: string[];
  fileUrl: string;
  fileType: string;
  createdAt: string;
  status: 'approved' | 'pending';
}

export interface Post {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  status: 'approved' | 'pending' | 'rejected';
  likes: number;
  commentCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string;
  message: string;
  createdAt: string;
}

// Current user
export const currentUser: User = {
  id: 1,
  username: 'sakura_learner',
  email: 'sakura@example.com',
  role: 'user',
  avatarUrl: '',
  streak: 12,
  totalWords: 347,
  totalQuizzes: 28,
  avgScore: 82,
  badges: ['🔥 7-Day Streak', '📚 100 Words', '🎯 Quiz Master', '🌸 Sakura Spirit'],
  createdAt: '2024-01-15',
  status: 'active',
};

export const mockDecks: FlashcardDeck[] = [
  { id: 1, ownerId: 1, ownerName: 'sakura_learner', title: 'JLPT N5 基本語彙', description: 'Từ vựng cơ bản N5', isPublic: true, jlptLevel: 'N5', cardCount: 50, createdAt: '2024-02-01' },
  { id: 2, ownerId: 1, ownerName: 'sakura_learner', title: 'Động từ nhóm 1', description: 'Các động từ thường gặp nhóm 1', isPublic: true, jlptLevel: 'N5', cardCount: 30, createdAt: '2024-02-15' },
  { id: 3, ownerId: 2, ownerName: 'nihongo_pro', title: 'JLPT N4 漢字', description: 'Kanji N4 với ví dụ', isPublic: true, jlptLevel: 'N4', cardCount: 80, createdAt: '2024-03-01' },
  { id: 4, ownerId: 2, ownerName: 'nihongo_pro', title: 'Keigo - Kính ngữ', description: 'Từ vựng kính ngữ thường dùng', isPublic: true, jlptLevel: 'N3', cardCount: 40, createdAt: '2024-03-10' },
  { id: 5, ownerId: 3, ownerName: 'sensei_tanaka', title: 'Từ vựng giao tiếp', description: 'Từ dùng trong giao tiếp hàng ngày', isPublic: true, jlptLevel: 'N5', cardCount: 25, createdAt: '2024-03-20' },
];

export const mockFlashcards: Flashcard[] = [
  { id: 1, deckId: 1, front: '食べる', back: 'Ăn (taberu)', example: '毎日ご飯を食べます。', learned: false },
  { id: 2, deckId: 1, front: '飲む', back: 'Uống (nomu)', example: 'お茶を飲みます。', learned: true },
  { id: 3, deckId: 1, front: '行く', back: 'Đi (iku)', example: '学校に行きます。', learned: false },
  { id: 4, deckId: 1, front: '見る', back: 'Xem, nhìn (miru)', example: 'テレビを見ます。', learned: false },
  { id: 5, deckId: 1, front: '読む', back: 'Đọc (yomu)', example: '本を読みます。', learned: true },
  { id: 6, deckId: 1, front: '書く', back: 'Viết (kaku)', example: '手紙を書きます。', learned: false },
  { id: 7, deckId: 1, front: '聞く', back: 'Nghe (kiku)', example: '音楽を聞きます。', learned: false },
  { id: 8, deckId: 1, front: '話す', back: 'Nói (hanasu)', example: '日本語を話します。', learned: true },
];

export const mockQuizzes: Quiz[] = [
  { id: 1, creatorId: 2, creatorName: 'nihongo_pro', title: 'N5 文法テスト', description: 'Kiểm tra ngữ pháp N5 cơ bản', questionCount: 10, isPublic: true, createdAt: '2024-02-20' },
  { id: 2, creatorId: 2, creatorName: 'nihongo_pro', title: 'Kanji N5 Quiz', description: 'Nhận biết Kanji N5', questionCount: 15, isPublic: true, createdAt: '2024-03-05' },
  { id: 3, creatorId: 3, creatorName: 'sensei_tanaka', title: 'Từ vựng hàng ngày', description: 'Quiz từ vựng sử dụng hàng ngày', questionCount: 8, isPublic: true, createdAt: '2024-03-15' },
];

export const mockQuizQuestions: QuizQuestion[] = [
  { id: 1, quizId: 1, questionText: '「おはようございます」nghĩa là gì?', optionA: 'Xin chào (sáng)', optionB: 'Tạm biệt', optionC: 'Cảm ơn', optionD: 'Xin lỗi', correctOption: 'A' },
  { id: 2, quizId: 1, questionText: 'Chọn cách đọc đúng của 「学生」', optionA: 'せんせい', optionB: 'がくせい', optionC: 'いしゃ', optionD: 'かいしゃ', correctOption: 'B' },
  { id: 3, quizId: 1, questionText: '「私は___を飲みます」- Chọn từ đúng:', optionA: 'ほん', optionB: 'みず', optionC: 'えんぴつ', optionD: 'くるま', correctOption: 'B' },
  { id: 4, quizId: 1, questionText: 'Trợ từ nào dùng để chỉ nơi đến?', optionA: 'は', optionB: 'を', optionC: 'に', optionD: 'で', correctOption: 'C' },
  { id: 5, quizId: 1, questionText: '「きれい」nghĩa là gì?', optionA: 'Xấu', optionB: 'Đẹp/Sạch', optionC: 'To lớn', optionD: 'Nhỏ bé', correctOption: 'B' },
];

export const mockPosts: Post[] = [
  { id: 1, authorId: 1, authorName: 'sakura_learner', authorAvatar: '', title: 'Cách nhớ Kanji hiệu quả nhất?', content: 'Mình đang học N4 và gặp khó khăn với Kanji. Các bạn có tip gì không?', status: 'approved', likes: 24, commentCount: 8, createdAt: '2024-03-18' },
  { id: 2, authorId: 2, authorName: 'nihongo_pro', authorAvatar: '', title: 'Chia sẻ tài liệu JLPT N3', content: 'Mình vừa tổng hợp tài liệu ôn thi N3 rất hay. Chia sẻ cho mọi người!', status: 'approved', likes: 42, commentCount: 15, createdAt: '2024-03-17' },
  { id: 3, authorId: 3, authorName: 'sensei_tanaka', authorAvatar: '', title: 'Phân biệt は và が', content: 'Hai trợ từ này thường gây nhầm lẫn. Hãy cùng tìm hiểu sự khác biệt.', status: 'approved', likes: 56, commentCount: 22, createdAt: '2024-03-16' },
];

export const mockMaterials: Material[] = [
  { id: 1, uploaderId: 2, uploaderName: 'nihongo_pro', title: 'JLPT N5 Grammar Summary', course: 'JLPT N5', tags: ['grammar', 'N5', 'beginner'], fileUrl: '#', fileType: 'pdf', createdAt: '2024-03-01', status: 'approved' },
  { id: 2, uploaderId: 3, uploaderName: 'sensei_tanaka', title: 'Kanji Writing Practice Sheets', course: 'Kanji', tags: ['kanji', 'writing', 'practice'], fileUrl: '#', fileType: 'pdf', createdAt: '2024-03-10', status: 'approved' },
  { id: 3, uploaderId: 1, uploaderName: 'sakura_learner', title: 'N4 Vocabulary List', course: 'JLPT N4', tags: ['vocabulary', 'N4'], fileUrl: '#', fileType: 'docx', createdAt: '2024-03-15', status: 'approved' },
];

export const mockChatMessages: ChatMessage[] = [
  { id: 1, userId: 2, username: 'nihongo_pro', avatarUrl: '', message: 'みなさん、こんにちは！🌸', createdAt: '2024-03-20T10:00:00' },
  { id: 2, userId: 3, username: 'sensei_tanaka', avatarUrl: '', message: 'Hôm nay ai ôn bài chưa?', createdAt: '2024-03-20T10:01:00' },
  { id: 3, userId: 1, username: 'sakura_learner', avatarUrl: '', message: 'Mình vừa học xong 20 từ mới! 💪', createdAt: '2024-03-20T10:02:00' },
  { id: 4, userId: 2, username: 'nihongo_pro', avatarUrl: '', message: 'すごい！Giỏi quá!', createdAt: '2024-03-20T10:03:00' },
  { id: 5, userId: 4, username: 'kanji_king', avatarUrl: '', message: 'Ai có deck Kanji N3 cho mình xin với 🙏', createdAt: '2024-03-20T10:05:00' },
];

export const weeklyProgress = [
  { day: 'T2', words: 15, quizzes: 2 },
  { day: 'T3', words: 22, quizzes: 1 },
  { day: 'T4', words: 18, quizzes: 3 },
  { day: 'T5', words: 30, quizzes: 2 },
  { day: 'T6', words: 25, quizzes: 4 },
  { day: 'T7', words: 35, quizzes: 2 },
  { day: 'CN', words: 28, quizzes: 3 },
];

export const monthlyScores = [
  { month: 'T1', score: 65 },
  { month: 'T2', score: 72 },
  { month: 'T3', score: 78 },
  { month: 'T4', score: 85 },
  { month: 'T5', score: 80 },
  { month: 'T6', score: 88 },
];

export const leaderboard = [
  { rank: 1, username: 'sensei_tanaka', score: 9850, streak: 45 },
  { rank: 2, username: 'nihongo_pro', score: 8720, streak: 38 },
  { rank: 3, username: 'kanji_king', score: 7650, streak: 30 },
  { rank: 4, username: 'sakura_learner', score: 6540, streak: 12 },
  { rank: 5, username: 'jpn_beginner', score: 5430, streak: 8 },
];
