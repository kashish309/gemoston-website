GEMSTONES = [
    {"id":"ruby","name":"Ruby","benefits":["confidence","vitality","leadership"],"description":"Ruby is traditionally associated with confidence and vitality."},
    {"id":"emerald","name":"Emerald","benefits":["renewal","balance","growth"],"description":"Emerald has a long history in jewellery and traditional symbolism."},
    {"id":"blue-sapphire","name":"Blue Sapphire","benefits":["wisdom","focus","calm"],"description":"Blue Sapphire is traditionally associated with wisdom and focus."},
    {"id":"amethyst","name":"Amethyst","benefits":["calm","reflection","clarity"],"description":"Amethyst is often used in jewellery and symbolic traditions."},
    {"id":"aqeeq","name":"Aqeeq","benefits":["tradition","steadfastness","personal meaning"],"description":"Aqeeq is valued in several cultural and jewellery traditions."},
    {"id":"citrine","name":"Citrine","benefits":["warmth","optimism","creativity"],"description":"Citrine is known for its golden colour and jewellery use."},
]
ZODIAC = {
    "Aries": ("Ruby", "Ruby is traditionally associated with Aries."),
    "Taurus": ("Emerald", "Emerald is traditionally associated with Taurus."),
    "Gemini": ("Aqeeq", "Aqeeq is offered here as a traditional association for Gemini."),
    "Cancer": ("Pearl", "Pearl is traditionally associated with Cancer."),
    "Leo": ("Ruby", "Ruby is traditionally associated with Leo."),
    "Virgo": ("Blue Sapphire", "Blue Sapphire is traditionally associated with Virgo."),
    "Libra": ("Emerald", "Emerald is traditionally associated with Libra."),
    "Scorpio": ("Blue Sapphire", "Blue Sapphire is offered here as a traditional association for Scorpio."),
    "Sagittarius": ("Citrine", "Citrine is offered here as a traditional association for Sagittarius."),
    "Capricorn": ("Aqeeq", "Aqeeq is offered here as a traditional association for Capricorn."),
    "Aquarius": ("Amethyst", "Amethyst is traditionally associated with Aquarius."),
    "Pisces": ("Amethyst", "Amethyst is traditionally associated with Pisces."),
}
ZODIAC_TRADITIONS = {
    sign: {"primary": stone, "alternative": "Ask us about other traditional associations", "description": reason}
    for sign, (stone, reason) in ZODIAC.items()
}
