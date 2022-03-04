db.auth('bilabor', 'bilabor')
db = db.getSiblingDB('bilabor')
db.rooms.insert({"name": "Titkos szoba"})
db.messages.insert([{ "user" : "Laborvezető", "date" : new ISODate(), "content" : "Üdvözöllek az Általános szobában!", "room" : "default", "avatarUrl" : "https://www.aut.bme.hu/Static/img/vik-logo.png"}, { "user" : "Laborvezető", "date" : new ISODate(), "content" : "Gratulálok, bejutottál a Titkos szobába!", "room" : "Titkos szoba", "avatarUrl" : "https://www.aut.bme.hu/Static/img/vik-logo.png" }])