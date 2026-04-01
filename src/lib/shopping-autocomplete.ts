export interface ShoppingItemSuggestion {
  name: string;
  nameEn: string;
  emoji: string;
  category: string;
}

export const SHOPPING_SUGGESTIONS: ShoppingItemSuggestion[] = [
  // ירקות
  { name: "עגבניות", nameEn: "Tomatoes", emoji: "🍅", category: "ירקות" },
  { name: "מלפפונים", nameEn: "Cucumbers", emoji: "🥒", category: "ירקות" },
  { name: "בצל", nameEn: "Onion", emoji: "🧅", category: "ירקות" },
  { name: "שום", nameEn: "Garlic", emoji: "🧄", category: "ירקות" },
  { name: "גזר", nameEn: "Carrot", emoji: "🥕", category: "ירקות" },
  { name: "פלפל", nameEn: "Bell Pepper", emoji: "🫑", category: "ירקות" },
  { name: "חסה", nameEn: "Lettuce", emoji: "🥬", category: "ירקות" },
  { name: "תפוחי אדמה", nameEn: "Potatoes", emoji: "🥔", category: "ירקות" },
  { name: "בטטה", nameEn: "Sweet Potato", emoji: "🍠", category: "ירקות" },
  { name: "חצילים", nameEn: "Eggplant", emoji: "🍆", category: "ירקות" },
  { name: "קישואים", nameEn: "Zucchini", emoji: "🥒", category: "ירקות" },
  { name: "כרוב", nameEn: "Cabbage", emoji: "🥬", category: "ירקות" },
  { name: "ברוקולי", nameEn: "Broccoli", emoji: "🥦", category: "ירקות" },
  { name: "כרובית", nameEn: "Cauliflower", emoji: "🥦", category: "ירקות" },
  { name: "תירס", nameEn: "Corn", emoji: "🌽", category: "ירקות" },
  { name: "אבוקדו", nameEn: "Avocado", emoji: "🥑", category: "ירקות" },
  { name: "פטריות", nameEn: "Mushrooms", emoji: "🍄", category: "ירקות" },
  { name: "לימון", nameEn: "Lemon", emoji: "🍋", category: "ירקות" },
  { name: "עגבניה שרי", nameEn: "Cherry Tomatoes", emoji: "🍅", category: "ירקות" },
  { name: "סלרי", nameEn: "Celery", emoji: "🥬", category: "ירקות" },

  // פירות
  { name: "תפוחים", nameEn: "Apples", emoji: "🍎", category: "פירות" },
  { name: "בננות", nameEn: "Bananas", emoji: "🍌", category: "פירות" },
  { name: "תפוזים", nameEn: "Oranges", emoji: "🍊", category: "פירות" },
  { name: "ענבים", nameEn: "Grapes", emoji: "🍇", category: "פירות" },
  { name: "אבטיח", nameEn: "Watermelon", emoji: "🍉", category: "פירות" },
  { name: "מלון", nameEn: "Melon", emoji: "🍈", category: "פירות" },
  { name: "אגסים", nameEn: "Pears", emoji: "🍐", category: "פירות" },
  { name: "שזיפים", nameEn: "Plums", emoji: "🫐", category: "פירות" },
  { name: "תותים", nameEn: "Strawberries", emoji: "🍓", category: "פירות" },
  { name: "קיווי", nameEn: "Kiwi", emoji: "🥝", category: "פירות" },
  { name: "מנגו", nameEn: "Mango", emoji: "🥭", category: "פירות" },
  { name: "אננס", nameEn: "Pineapple", emoji: "🍍", category: "פירות" },
  { name: "רימון", nameEn: "Pomegranate", emoji: "🍎", category: "פירות" },
  { name: "אפרסקים", nameEn: "Peaches", emoji: "🍑", category: "פירות" },
  { name: "דובדבנים", nameEn: "Cherries", emoji: "🍒", category: "פירות" },
  { name: "לימונים", nameEn: "Lemons", emoji: "🍋", category: "פירות" },

  // עשבי תיבול
  { name: "כוסברה", nameEn: "Coriander", emoji: "🌿", category: "עשבי תיבול" },
  { name: "פטרוזיליה", nameEn: "Parsley", emoji: "🌿", category: "עשבי תיבול" },
  { name: "שמיר", nameEn: "Dill", emoji: "🌿", category: "עשבי תיבול" },
  { name: "נענע", nameEn: "Mint", emoji: "🌱", category: "עשבי תיבול" },
  { name: "בזיליקום", nameEn: "Basil", emoji: "🌿", category: "עשבי תיבול" },
  { name: "רוזמרין", nameEn: "Rosemary", emoji: "🌿", category: "עשבי תיבול" },
  { name: "טימין", nameEn: "Thyme", emoji: "🌿", category: "עשבי תיבול" },
  { name: "עירית", nameEn: "Chives", emoji: "🌱", category: "עשבי תיבול" },

  // מוצרי בסיס
  { name: "ביצים", nameEn: "Eggs", emoji: "🥚", category: "מוצרי בסיס" },
  { name: "שמן זית", nameEn: "Olive Oil", emoji: "🫒", category: "מוצרי בסיס" },
  { name: "שמן קנולה", nameEn: "Canola Oil", emoji: "🫙", category: "מוצרי בסיס" },
  { name: "מלח", nameEn: "Salt", emoji: "🧂", category: "מוצרי בסיס" },
  { name: "סוכר", nameEn: "Sugar", emoji: "🍬", category: "מוצרי בסיס" },
  { name: "קמח", nameEn: "Flour", emoji: "🌾", category: "מוצרי בסיס" },
  { name: "אורז", nameEn: "Rice", emoji: "🍚", category: "מוצרי בסיס" },
  { name: "פסטה", nameEn: "Pasta", emoji: "🍝", category: "מוצרי בסיס" },

  // מוצרי חלב
  { name: "חלב", nameEn: "Milk", emoji: "🥛", category: "מוצרי חלב" },
  { name: "גבינה צהובה", nameEn: "Yellow Cheese", emoji: "🧀", category: "מוצרי חלב" },
  { name: "גבינה לבנה", nameEn: "White Cheese", emoji: "🧀", category: "מוצרי חלב" },
  { name: "קוטג'", nameEn: "Cottage Cheese", emoji: "🥛", category: "מוצרי חלב" },
  { name: "שמנת", nameEn: "Cream", emoji: "🍶", category: "מוצרי חלב" },
  { name: "יוגורט", nameEn: "Yogurt", emoji: "🥛", category: "מוצרי חלב" },
  { name: "חמאה", nameEn: "Butter", emoji: "🧈", category: "מוצרי חלב" },
  { name: "שמנת חמוצה", nameEn: "Sour Cream", emoji: "🥛", category: "מוצרי חלב" },
  { name: "גבינת שמנת", nameEn: "Cream Cheese", emoji: "🧀", category: "מוצרי חלב" },
  { name: "לבן", nameEn: "Laban", emoji: "🥛", category: "מוצרי חלב" },
  { name: "גבינה בולגרית", nameEn: "Bulgarian Cheese", emoji: "🧀", category: "מוצרי חלב" },
  { name: "פרמזן", nameEn: "Parmesan", emoji: "🧀", category: "מוצרי חלב" },

  // חלב
  { name: "חלב 3%", nameEn: "Milk 3%", emoji: "🥛", category: "חלב" },
  { name: "חלב 1%", nameEn: "Milk 1%", emoji: "🥛", category: "חלב" },
  { name: "חלב שקדים", nameEn: "Almond Milk", emoji: "🥛", category: "חלב" },
  { name: "חלב סויה", nameEn: "Soy Milk", emoji: "🥛", category: "חלב" },
  { name: "חלב אוכמניות", nameEn: "Oat Milk", emoji: "🥛", category: "חלב" },

  // בשר/ביצים/דגים
  { name: "עוף", nameEn: "Chicken", emoji: "🍗", category: "בשר/ביצים/דגים" },
  { name: "בקר", nameEn: "Beef", emoji: "🥩", category: "בשר/ביצים/דגים" },
  { name: "הודו", nameEn: "Turkey", emoji: "🍗", category: "בשר/ביצים/דגים" },
  { name: "סלמון", nameEn: "Salmon", emoji: "🐟", category: "בשר/ביצים/דגים" },
  { name: "טונה", nameEn: "Tuna", emoji: "🐟", category: "בשר/ביצים/דגים" },
  { name: "שניצל", nameEn: "Schnitzel", emoji: "🍗", category: "בשר/ביצים/דגים" },
  { name: "קבב", nameEn: "Kebab", emoji: "🥩", category: "בשר/ביצים/דגים" },
  { name: "נקניקיות", nameEn: "Sausages", emoji: "🌭", category: "בשר/ביצים/דגים" },
  { name: "בשר טחון", nameEn: "Ground Meat", emoji: "🥩", category: "בשר/ביצים/דגים" },
  { name: "כנפיים", nameEn: "Chicken Wings", emoji: "🍗", category: "בשר/ביצים/דגים" },
  { name: "חזה עוף", nameEn: "Chicken Breast", emoji: "🍗", category: "בשר/ביצים/דגים" },
  { name: "דניס", nameEn: "Sea Bass", emoji: "🐟", category: "בשר/ביצים/דגים" },
  { name: "פורל", nameEn: "Trout", emoji: "🐟", category: "בשר/ביצים/דגים" },

  // קטניות ותוספות
  { name: "חומוס", nameEn: "Chickpeas", emoji: "🫘", category: "קטניות ותוספות" },
  { name: "עדשים", nameEn: "Lentils", emoji: "🫘", category: "קטניות ותוספות" },
  { name: "שעועית", nameEn: "Beans", emoji: "🫘", category: "קטניות ותוספות" },
  { name: "טחינה", nameEn: "Tahini", emoji: "🫙", category: "קטניות ותוספות" },
  { name: "חומוס מוכן", nameEn: "Ready Hummus", emoji: "🫘", category: "קטניות ותוספות" },
  { name: "פול", nameEn: "Fava Beans", emoji: "🫘", category: "קטניות ותוספות" },
  { name: "כוסמת", nameEn: "Buckwheat", emoji: "🌾", category: "קטניות ותוספות" },
  { name: "קינואה", nameEn: "Quinoa", emoji: "🌾", category: "קטניות ותוספות" },

  // מאפים ודגנים
  { name: "לחם", nameEn: "Bread", emoji: "🍞", category: "מאפים ודגנים" },
  { name: "פיתות", nameEn: "Pita", emoji: "🫓", category: "מאפים ודגנים" },
  { name: "חלה", nameEn: "Challah", emoji: "🍞", category: "מאפים ודגנים" },
  { name: "קוסקוס", nameEn: "Couscous", emoji: "🍚", category: "מאפים ודגנים" },
  { name: "בורגול", nameEn: "Bulgur", emoji: "🌾", category: "מאפים ודגנים" },
  { name: "קורנפלקס", nameEn: "Cornflakes", emoji: "🥣", category: "מאפים ודגנים" },
  { name: "גרנולה", nameEn: "Granola", emoji: "🥣", category: "מאפים ודגנים" },
  { name: "שיבולת שועל", nameEn: "Oatmeal", emoji: "🥣", category: "מאפים ודגנים" },
  { name: "ביסקוויטים", nameEn: "Biscuits", emoji: "🍪", category: "מאפים ודגנים" },
  { name: "לחם שיפון", nameEn: "Rye Bread", emoji: "🍞", category: "מאפים ודגנים" },
  { name: "לחמניות", nameEn: "Rolls", emoji: "🫓", category: "מאפים ודגנים" },
  { name: "קרואסון", nameEn: "Croissant", emoji: "🥐", category: "מאפים ודגנים" },
  { name: "לחם כוסמין", nameEn: "Spelt Bread", emoji: "🍞", category: "מאפים ודגנים" },

  // אגוזים
  { name: "אגוזי מלך", nameEn: "Walnuts", emoji: "🥜", category: "אגוזים" },
  { name: "שקדים", nameEn: "Almonds", emoji: "🥜", category: "אגוזים" },
  { name: "בוטנים", nameEn: "Peanuts", emoji: "🥜", category: "אגוזים" },
  { name: "קשיו", nameEn: "Cashews", emoji: "🥜", category: "אגוזים" },
  { name: "פקאן", nameEn: "Pecans", emoji: "🥜", category: "אגוזים" },
  { name: "פיסטוק", nameEn: "Pistachios", emoji: "🥜", category: "אגוזים" },
  { name: "אגוזי ברזיל", nameEn: "Brazil Nuts", emoji: "🥜", category: "אגוזים" },
  { name: "אגוזי לוז", nameEn: "Hazelnuts", emoji: "🥜", category: "אגוזים" },

  // קפואים
  { name: "ירקות קפואים", nameEn: "Frozen Vegetables", emoji: "🥦", category: "קפואים" },
  { name: "פיצה קפואה", nameEn: "Frozen Pizza", emoji: "🍕", category: "קפואים" },
  { name: "גלידה", nameEn: "Ice Cream", emoji: "🍦", category: "קפואים" },
  { name: "בורקס", nameEn: "Bourekas", emoji: "🥐", category: "קפואים" },
  { name: "שניצל קפוא", nameEn: "Frozen Schnitzel", emoji: "🍗", category: "קפואים" },
  { name: "אפונה קפואה", nameEn: "Frozen Peas", emoji: "🫛", category: "קפואים" },
  { name: "תירס קפוא", nameEn: "Frozen Corn", emoji: "🌽", category: "קפואים" },
  { name: "סורבה", nameEn: "Sorbet", emoji: "🍧", category: "קפואים" },

  // שימורים
  { name: "טונה בשימורים", nameEn: "Canned Tuna", emoji: "🐟", category: "שימורים" },
  { name: "תירס בשימורים", nameEn: "Canned Corn", emoji: "🌽", category: "שימורים" },
  { name: "זיתים", nameEn: "Olives", emoji: "🫒", category: "שימורים" },
  { name: "מלפפון חמוץ", nameEn: "Pickles", emoji: "🥒", category: "שימורים" },
  { name: "רסק עגבניות", nameEn: "Tomato Paste", emoji: "🍅", category: "שימורים" },
  { name: "שעועית בשימורים", nameEn: "Canned Beans", emoji: "🫘", category: "שימורים" },
  { name: "חומוס בשימורים", nameEn: "Canned Chickpeas", emoji: "🫘", category: "שימורים" },
  { name: "אפרסקים בשימורים", nameEn: "Canned Peaches", emoji: "🍑", category: "שימורים" },

  // תבלינים
  { name: "פלפל שחור", nameEn: "Black Pepper", emoji: "🌶️", category: "תבלינים" },
  { name: "כמון", nameEn: "Cumin", emoji: "🌿", category: "תבלינים" },
  { name: "פפריקה", nameEn: "Paprika", emoji: "🌶️", category: "תבלינים" },
  { name: "כורכום", nameEn: "Turmeric", emoji: "🌿", category: "תבלינים" },
  { name: "אורגנו", nameEn: "Oregano", emoji: "🌿", category: "תבלינים" },
  { name: "קינמון", nameEn: "Cinnamon", emoji: "🍂", category: "תבלינים" },
  { name: "ג'ינג'ר", nameEn: "Ginger", emoji: "🌿", category: "תבלינים" },
  { name: "כוסברה טחונה", nameEn: "Ground Coriander", emoji: "🌿", category: "תבלינים" },
  { name: "הל", nameEn: "Cardamom", emoji: "🌿", category: "תבלינים" },
  { name: "זעתר", nameEn: "Za'atar", emoji: "🌿", category: "תבלינים" },

  // ממרחים
  { name: "חמאת בוטנים", nameEn: "Peanut Butter", emoji: "🥜", category: "ממרחים" },
  { name: "שוקולד למריחה", nameEn: "Chocolate Spread", emoji: "🍫", category: "ממרחים" },
  { name: "דבש", nameEn: "Honey", emoji: "🍯", category: "ממרחים" },
  { name: "ריבה", nameEn: "Jam", emoji: "🍓", category: "ממרחים" },
  { name: "חמאת שקדים", nameEn: "Almond Butter", emoji: "🥜", category: "ממרחים" },
  { name: "ממרח גבינה", nameEn: "Cheese Spread", emoji: "🧀", category: "ממרחים" },
  { name: "סביח", nameEn: "Sabich Spread", emoji: "🫙", category: "ממרחים" },

  // מטבלים ורטבים
  { name: "קטשופ", nameEn: "Ketchup", emoji: "🍅", category: "מטבלים ורטבים" },
  { name: "חרדל", nameEn: "Mustard", emoji: "💛", category: "מטבלים ורטבים" },
  { name: "מיונז", nameEn: "Mayonnaise", emoji: "🥚", category: "מטבלים ורטבים" },
  { name: "סויה", nameEn: "Soy Sauce", emoji: "🥢", category: "מטבלים ורטבים" },
  { name: "חומץ", nameEn: "Vinegar", emoji: "🫙", category: "מטבלים ורטבים" },
  { name: "רוטב צ'ילי", nameEn: "Chili Sauce", emoji: "🌶️", category: "מטבלים ורטבים" },
  { name: "סלסה", nameEn: "Salsa", emoji: "🍅", category: "מטבלים ורטבים" },
  { name: "רוטב סויה", nameEn: "Soy Sauce", emoji: "🥢", category: "מטבלים ורטבים" },
  { name: "פסטו", nameEn: "Pesto", emoji: "🌿", category: "מטבלים ורטבים" },

  // משקאות
  { name: "מים", nameEn: "Water", emoji: "💧", category: "משקאות" },
  { name: "מיץ תפוזים", nameEn: "Orange Juice", emoji: "🧃", category: "משקאות" },
  { name: "קולה", nameEn: "Cola", emoji: "🥤", category: "משקאות" },
  { name: "בירה", nameEn: "Beer", emoji: "🍺", category: "משקאות" },
  { name: "יין", nameEn: "Wine", emoji: "🍷", category: "משקאות" },
  { name: "קפה", nameEn: "Coffee", emoji: "☕", category: "משקאות" },
  { name: "תה", nameEn: "Tea", emoji: "🍵", category: "משקאות" },
  { name: "סודה", nameEn: "Soda", emoji: "🥤", category: "משקאות" },
  { name: "מיץ תפוח", nameEn: "Apple Juice", emoji: "🧃", category: "משקאות" },
  { name: "מיץ ענבים", nameEn: "Grape Juice", emoji: "🧃", category: "משקאות" },
  { name: "לימונדה", nameEn: "Lemonade", emoji: "🍋", category: "משקאות" },
  { name: "נספרסו", nameEn: "Nespresso", emoji: "☕", category: "משקאות" },

  // חטיפים ומתוקים
  { name: "שוקולד", nameEn: "Chocolate", emoji: "🍫", category: "חטיפים ומתוקים" },
  { name: "ופלים", nameEn: "Waffles", emoji: "🧇", category: "חטיפים ומתוקים" },
  { name: "חטיף אנרגיה", nameEn: "Energy Bar", emoji: "🍫", category: "חטיפים ומתוקים" },
  { name: "במבה", nameEn: "Bamba", emoji: "🥜", category: "חטיפים ומתוקים" },
  { name: "ביסלי", nameEn: "Bisli", emoji: "🍟", category: "חטיפים ומתוקים" },
  { name: "פופקורן", nameEn: "Popcorn", emoji: "🍿", category: "חטיפים ומתוקים" },
  { name: "סוכריות", nameEn: "Candy", emoji: "🍬", category: "חטיפים ומתוקים" },
  { name: "עוגיות", nameEn: "Cookies", emoji: "🍪", category: "חטיפים ומתוקים" },
  { name: "במבה ללא בוטנים", nameEn: "Bamba no nuts", emoji: "🍿", category: "חטיפים ומתוקים" },
  { name: "שוקולד מריר", nameEn: "Dark Chocolate", emoji: "🍫", category: "חטיפים ומתוקים" },
  { name: "גומיות", nameEn: "Gummies", emoji: "🍬", category: "חטיפים ומתוקים" },

  // מצרכים לאפייה
  { name: "אבקת אפייה", nameEn: "Baking Powder", emoji: "🥄", category: "מצרכים לאפייה" },
  { name: "וניל", nameEn: "Vanilla", emoji: "🍶", category: "מצרכים לאפייה" },
  { name: "שוקולד צ'יפס", nameEn: "Chocolate Chips", emoji: "🍫", category: "מצרכים לאפייה" },
  { name: "קוקוס מגורד", nameEn: "Shredded Coconut", emoji: "🥥", category: "מצרכים לאפייה" },
  { name: "אבקת סוכר", nameEn: "Powdered Sugar", emoji: "🍬", category: "מצרכים לאפייה" },
  { name: "קקאו", nameEn: "Cocoa", emoji: "🍫", category: "מצרכים לאפייה" },
  { name: "קמח תופח", nameEn: "Self-Rising Flour", emoji: "🌾", category: "מצרכים לאפייה" },
  { name: "שמרים", nameEn: "Yeast", emoji: "🍞", category: "מצרכים לאפייה" },

  // ניקיון וכביסה
  { name: "סבון כלים", nameEn: "Dish Soap", emoji: "🧴", category: "ניקיון וכביסה" },
  { name: "אקונומיקה", nameEn: "Bleach", emoji: "🧴", category: "ניקיון וכביסה" },
  { name: "מרכך כביסה", nameEn: "Fabric Softener", emoji: "🧺", category: "ניקיון וכביסה" },
  { name: "אבקת כביסה", nameEn: "Laundry Detergent", emoji: "🧺", category: "ניקיון וכביסה" },
  { name: "שקיות אשפה", nameEn: "Garbage Bags", emoji: "🗑️", category: "ניקיון וכביסה" },
  { name: "מגבוני ניקוי", nameEn: "Cleaning Wipes", emoji: "🧻", category: "ניקיון וכביסה" },
  { name: "ספוגים", nameEn: "Sponges", emoji: "🧽", category: "ניקיון וכביסה" },
  { name: "ספריי לחלונות", nameEn: "Window Spray", emoji: "🧴", category: "ניקיון וכביסה" },
  { name: "סבון ידיים", nameEn: "Hand Soap", emoji: "🧼", category: "ניקיון וכביסה" },
  { name: "נוזל רצפה", nameEn: "Floor Cleaner", emoji: "🧴", category: "ניקיון וכביסה" },

  // תרופות
  { name: "אקמול", nameEn: "Paracetamol", emoji: "💊", category: "תרופות" },
  { name: "נורופן", nameEn: "Ibuprofen", emoji: "💊", category: "תרופות" },
  { name: "ויטמינים", nameEn: "Vitamins", emoji: "💊", category: "תרופות" },
  { name: "פלסטרים", nameEn: "Band-aids", emoji: "🩹", category: "תרופות" },
  { name: "אלכוג'ל", nameEn: "Hand Sanitizer", emoji: "🧴", category: "תרופות" },
  { name: "ויטמין C", nameEn: "Vitamin C", emoji: "💊", category: "תרופות" },
  { name: "אספירין", nameEn: "Aspirin", emoji: "💊", category: "תרופות" },

  // חיות מחמד
  { name: "אוכל לחתולים", nameEn: "Cat Food", emoji: "🐱", category: "חיות מחמד" },
  { name: "אוכל לכלבים", nameEn: "Dog Food", emoji: "🐕", category: "חיות מחמד" },
  { name: "חול לחתולים", nameEn: "Cat Litter", emoji: "🐱", category: "חיות מחמד" },
  { name: "חטיפים לחיות", nameEn: "Pet Treats", emoji: "🦴", category: "חיות מחמד" },
  { name: "שמפו לכלבים", nameEn: "Dog Shampoo", emoji: "🐕", category: "חיות מחמד" },

  // שונות
  { name: "נייר טואלט", nameEn: "Toilet Paper", emoji: "🧻", category: "שונות" },
  { name: "מפיות", nameEn: "Napkins", emoji: "🧻", category: "שונות" },
  { name: "שקיות ג'יפלוק", nameEn: "Ziplock Bags", emoji: "🛍️", category: "שונות" },
  { name: "נייר אלומיניום", nameEn: "Aluminum Foil", emoji: "🪙", category: "שונות" },
  { name: "נרות", nameEn: "Candles", emoji: "🕯️", category: "שונות" },
  { name: "מגבות נייר", nameEn: "Paper Towels", emoji: "🧻", category: "שונות" },
  { name: "ניילון נצמד", nameEn: "Cling Wrap", emoji: "🛍️", category: "שונות" },
  { name: "כוסות חד פעמי", nameEn: "Disposable Cups", emoji: "🥤", category: "שונות" },
  { name: "צלחות חד פעמי", nameEn: "Disposable Plates", emoji: "🍽️", category: "שונות" },
];

export function searchSuggestions(
  query: string,
  limit = 8
): ShoppingItemSuggestion[] {
  if (!query || query.trim() === "") {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  return SHOPPING_SUGGESTIONS.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery) ||
    item.nameEn.toLowerCase().includes(normalizedQuery)
  ).slice(0, limit);
}

export function getEmojiForItem(name: string): string {
  if (!name || name.trim() === "") {
    return "🛒";
  }

  const normalizedName = name.trim().toLowerCase();

  // Exact match first
  const exactMatch = SHOPPING_SUGGESTIONS.find(
    (item) => item.name.toLowerCase() === normalizedName
  );
  if (exactMatch) {
    return exactMatch.emoji;
  }

  // Fuzzy: name contains a suggestion name or suggestion name contains name
  const fuzzyMatch = SHOPPING_SUGGESTIONS.find(
    (item) =>
      normalizedName.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(normalizedName)
  );
  if (fuzzyMatch) {
    return fuzzyMatch.emoji;
  }

  return "🛒";
}

export function getSuggestionsForCategory(
  category: string
): ShoppingItemSuggestion[] {
  return SHOPPING_SUGGESTIONS.filter((item) => item.category === category);
}
