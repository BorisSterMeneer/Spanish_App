import type { Item, ItemKind, Unit } from '../types'

/*
 * Hand-written A1 curriculum (Castilian Spanish, with notes where Latin
 * American usage differs). Content is static and reviewed; nothing here is
 * generated at runtime.
 *
 * Item ids are derived from the unit id + the Spanish text, so editing the
 * English or a note keeps a learner's progress, but changing the Spanish
 * text creates a new item.
 */

type Extra = Pick<Item, 'alts' | 'note'>

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function make(unit: string) {
  const item =
    (kind: ItemKind) =>
    (es: string, en: string, extra: Extra = {}): Item => ({
      id: `${unit}:${slug(es)}`,
      kind,
      es,
      en,
      ...extra,
    })
  return {
    W: item('word'),
    P: item('phrase'),
    S: item('sentence'),
    /** Cloze drill. `cloze` contains "___" where `answer` goes. */
    C: (cloze: string, answer: string, choices: string[], en: string, hint?: string, note?: string): Item => {
      const es = cloze.replace('___', answer)
      return {
        id: `${unit}:c-${slug(es)}`,
        kind: 'cloze',
        es: es.charAt(0).toUpperCase() + es.slice(1),
        en,
        cloze,
        answer,
        choices,
        hint,
        note,
      }
    },
  }
}

// ---------------------------------------------------------------- Unit 1
const u1 = make('u1')
const unit1: Unit = {
  id: 'u1',
  title: 'Greetings and introductions',
  cefr: 'A1',
  grammar: {
    title: 'Greetings, tú vs. usted, and ¿ ¡',
    body: [
      'Spanish questions and exclamations open with an upside-down mark: ¿Cómo estás? ¡Hola!',
      'Use tú (informal "you") with friends, family, children and people your age. Use usted (formal "you") with strangers, older people and in formal settings. Usted uses the same verb form as él / ella (he / she).',
      'Subject pronouns (yo, tú, él…) are usually left out, because the verb ending already shows who is meant: "Me llamo Ana" is more natural than "Yo me llamo Ana". Both are correct.',
      '"Me llamo…" literally means "I call myself…". It is the normal way to say your name.',
    ],
    examples: [
      { es: 'Hola, ¿cómo estás?', en: 'Hi, how are you?' },
      { es: '¿Cómo está usted?', en: 'How are you? (formal)' },
      { es: 'Me llamo Pablo.', en: 'My name is Pablo.' },
      { es: 'Mucho gusto.', en: 'Nice to meet you.' },
    ],
  },
  items: [
    u1.W('hola', 'hello'),
    u1.W('adiós', 'goodbye'),
    u1.P('buenos días', 'good morning'),
    u1.P('buenas tardes', 'good afternoon', { note: 'Used from about lunchtime until it gets dark.' }),
    u1.P('buenas noches', 'good evening / good night'),
    u1.W('gracias', 'thank you'),
    u1.P('muchas gracias', 'thank you very much'),
    u1.P('por favor', 'please'),
    u1.P('de nada', "you're welcome"),
    u1.W('sí', 'yes', { note: 'With an accent, sí means "yes". Without it, si means "if".' }),
    u1.W('perdón', 'sorry / excuse me'),
    u1.P('hasta luego', 'see you later'),
    u1.P('hasta mañana', 'see you tomorrow'),
    u1.P('¿Cómo estás?', 'How are you? (informal)'),
    u1.S('Estoy bien.', "I'm fine.", { alts: ['bien', 'muy bien', 'estoy muy bien'] }),
    u1.P('¿Y tú?', 'And you? (informal)'),
    u1.P('¿Cómo te llamas?', "What's your name? (informal)", { note: 'Literally: "How do you call yourself?"' }),
    u1.S('Me llamo Ana.', 'My name is Ana.', { alts: ['yo me llamo ana'] }),
    u1.P('Mucho gusto.', 'Nice to meet you.', {
      alts: ['encantado', 'encantada'],
      note: 'Encantado (said by a man) / encantada (said by a woman) also means "nice to meet you".',
    }),
    u1.C('¿Cómo ___ llamas?', 'te', ['me', 'se'], "What's your name?"),
    u1.C('Me ___ Pablo.', 'llamo', ['llamas', 'llama'], 'My name is Pablo.'),
    u1.C('¿Cómo está ___?', 'usted', ['tú', 'yo'], 'How are you? (formal)', 'formal "you"'),
    u1.C('Buenas ___, ¿cómo estás?', 'tardes', ['días', 'tarde'], 'Good afternoon, how are you?', undefined, 'It is buenos días but buenas tardes / buenas noches.'),
  ],
}

// ---------------------------------------------------------------- Unit 2
const u2 = make('u2')
const unit2: Unit = {
  id: 'u2',
  title: 'Nouns, gender and articles',
  cefr: 'A1',
  grammar: {
    title: 'Every noun is masculine or feminine',
    body: [
      'Every Spanish noun has a gender. Most nouns ending in -o are masculine and most ending in -a are feminine. For other endings you have to learn it, so always learn a noun together with its article.',
      '| | masculine | feminine',
      '| the (singular) | el | la',
      '| the (plural) | los | las',
      '| a / an | un | una',
      '| some | unos | unas',
      'Plural: add -s after a vowel (libro → libros) and -es after a consonant (ciudad → ciudades).',
      'Common exceptions to learn now: el día (day) and el problema (problem) are masculine; la mano (hand) is feminine.',
    ],
    examples: [
      { es: 'el libro, los libros', en: 'the book, the books' },
      { es: 'la casa, las casas', en: 'the house, the houses' },
      { es: 'una ciudad, dos ciudades', en: 'a city, two cities' },
      { es: 'un día', en: 'a day' },
    ],
  },
  items: [
    u2.W('el libro', 'the book'),
    u2.W('la casa', 'the house'),
    u2.W('el perro', 'the dog'),
    u2.W('el gato', 'the cat'),
    u2.W('la mesa', 'the table'),
    u2.W('la silla', 'the chair'),
    u2.W('el coche', 'the car', { alts: ['el carro', 'el auto'], note: 'Spain: el coche. Latin America: el carro or el auto.' }),
    u2.W('la ciudad', 'the city'),
    u2.W('el día', 'the day', { note: 'Ends in -a but is masculine.' }),
    u2.W('la mano', 'the hand', { note: 'Ends in -o but is feminine.' }),
    u2.W('el problema', 'the problem', { note: 'Ends in -a but is masculine.' }),
    u2.W('el hombre', 'the man'),
    u2.W('la mujer', 'the woman'),
    u2.W('el niño', 'the boy / the child'),
    u2.W('la niña', 'the girl'),
    u2.W('el amigo', 'the friend (male)'),
    u2.W('la amiga', 'the friend (female)'),
    u2.C('___ casa', 'la', ['el', 'los'], 'the house'),
    u2.C('___ libros', 'los', ['las', 'el'], 'the books'),
    u2.C('___ ciudad', 'una', ['un', 'unas'], 'a city', '"a"'),
    u2.C('___ problema', 'el', ['la', 'una'], 'the problem'),
    u2.C('___ mano', 'la', ['el', 'un'], 'the hand'),
    u2.C('dos ___', 'ciudades', ['ciudads', 'ciudad'], 'two cities', 'ciudad'),
    u2.C('unos ___', 'perros', ['perro', 'perroes'], 'some dogs', 'perro'),
  ],
}

// ---------------------------------------------------------------- Unit 3
const u3 = make('u3')
const unit3: Unit = {
  id: 'u3',
  title: 'Ser: who and what you are',
  cefr: 'A1',
  grammar: {
    title: 'Ser (to be): identity, origin, profession, description',
    body: [
      'Ser is irregular. Learn all six forms:',
      '| yo | soy | I am',
      '| tú | eres | you are',
      '| él / ella / usted | es | he / she is, you are (formal)',
      '| nosotros / nosotras | somos | we are',
      '| vosotros / vosotras | sois | you all are (Spain only)',
      '| ellos / ellas / ustedes | son | they are, you all are',
      'Use ser for what someone or something is: identity, nationality, origin (ser de + place), profession and lasting characteristics.',
      'No article before a profession: "Soy médico", not "Soy un médico".',
      'Adjectives agree with the noun in gender and number: alto, alta, altos, altas. Adjectives ending in -e (inteligente) only change for plural. Nationalities ending in a consonant add -a for feminine: español → española.',
    ],
    examples: [
      { es: 'Soy ingeniero.', en: 'I am an engineer.' },
      { es: '¿De dónde eres? Soy de Madrid.', en: 'Where are you from? I am from Madrid.' },
      { es: 'Ella es alta y simpática.', en: 'She is tall and nice.' },
      { es: 'Somos estudiantes.', en: 'We are students.' },
    ],
  },
  items: [
    u3.W('alto', 'tall', { alts: ['alta'] }),
    u3.W('bajo', 'short (height)', { alts: ['baja'] }),
    u3.W('simpático', 'nice / friendly', { alts: ['simpática'] }),
    u3.W('inteligente', 'intelligent / smart'),
    u3.W('joven', 'young'),
    u3.W('nuevo', 'new', { alts: ['nueva'] }),
    u3.W('español', 'Spanish (nationality)', { alts: ['española'], note: 'Nationalities are written in lowercase in Spanish.' }),
    u3.W('inglés', 'English (nationality)', { alts: ['inglesa'] }),
    u3.W('estudiante', 'student'),
    u3.W('médico', 'doctor', { alts: ['médica'] }),
    u3.W('profesor', 'teacher', { alts: ['profesora'] }),
    u3.W('ingeniero', 'engineer', { alts: ['ingeniera'] }),
    u3.S('Soy estudiante.', 'I am a student.'),
    u3.S('Ella es médica.', 'She is a doctor.'),
    u3.S('Somos amigos.', 'We are friends.'),
    u3.S('¿De dónde eres?', 'Where are you from? (informal)'),
    u3.S('Soy de Madrid.', 'I am from Madrid.'),
    u3.S('Ellos son altos.', 'They are tall.'),
    u3.S('El coche es nuevo.', 'The car is new.'),
    u3.C('Yo ___ ingeniero.', 'soy', ['es', 'eres'], 'I am an engineer.', 'ser'),
    u3.C('Tú ___ muy simpático.', 'eres', ['es', 'soy'], 'You are very nice.', 'ser'),
    u3.C('Nosotros ___ de Madrid.', 'somos', ['son', 'sois'], 'We are from Madrid.', 'ser'),
    u3.C('Ellas ___ estudiantes.', 'son', ['es', 'somos'], 'They are students.', 'ser'),
    u3.C('Ana es ___.', 'alta', ['alto', 'altas'], 'Ana is tall.', 'alto'),
    u3.C('Los niños son ___.', 'simpáticos', ['simpático', 'simpáticas'], 'The children are nice.', 'simpático'),
    u3.C('Ella es ___.', 'española', ['español', 'españolas'], 'She is Spanish.', 'español'),
    u3.C('Mi amiga ___ profesora.', 'es', ['eres', 'son'], 'My friend is a teacher.', 'ser', 'No article before a profession.'),
  ],
}

// ---------------------------------------------------------------- Unit 4
const u4 = make('u4')
const unit4: Unit = {
  id: 'u4',
  title: 'Estar: where and how you are',
  cefr: 'A1',
  grammar: {
    title: 'Estar (to be): location and temporary states',
    body: [
      'Estar is the second verb for "to be":',
      '| yo | estoy | I am',
      '| tú | estás | you are',
      '| él / ella / usted | está | he / she is, you are (formal)',
      '| nosotros / nosotras | estamos | we are',
      '| vosotros / vosotras | estáis | you all are (Spain only)',
      '| ellos / ellas / ustedes | están | they are, you all are',
      'Use estar for where someone or something is (location) and for how they are right now (feelings, conditions).',
      'Quick test: what something is → ser. Where it is, or how it is at the moment → estar. "Pablo es alto" (a characteristic) but "Pablo está cansado" (a state).',
      'Estar en = to be in / at / on. En casa = at home.',
    ],
    examples: [
      { es: 'Estoy en casa.', en: 'I am at home.' },
      { es: 'Estoy cansado.', en: 'I am tired.' },
      { es: 'El libro está en la mesa.', en: 'The book is on the table.' },
      { es: 'Madrid está en España.', en: 'Madrid is in Spain.' },
    ],
  },
  items: [
    u4.W('cansado', 'tired', { alts: ['cansada'] }),
    u4.W('contento', 'happy / glad', { alts: ['contenta'] }),
    u4.W('triste', 'sad'),
    u4.W('enfermo', 'ill / sick', { alts: ['enferma'] }),
    u4.W('ocupado', 'busy', { alts: ['ocupada'] }),
    u4.P('en casa', 'at home'),
    u4.W('aquí', 'here'),
    u4.W('allí', 'there', { alts: ['ahí', 'allá'] }),
    u4.W('el trabajo', 'work / the job'),
    u4.W('la oficina', 'the office'),
    u4.W('el restaurante', 'the restaurant'),
    u4.S('Estoy cansado.', 'I am tired.', { alts: ['estoy cansada'] }),
    u4.S('¿Dónde estás?', 'Where are you? (informal)'),
    u4.S('Estamos en casa.', 'We are at home.'),
    u4.S('El libro está en la mesa.', 'The book is on the table.'),
    u4.S('Madrid está en España.', 'Madrid is in Spain.'),
    u4.S('Ella está enferma.', 'She is ill.'),
    u4.S('Estoy en el trabajo.', 'I am at work.'),
    u4.C('Yo ___ en la oficina.', 'estoy', ['estás', 'soy'], 'I am in the office.', 'estar'),
    u4.C('¿Dónde ___ tú?', 'estás', ['eres', 'está'], 'Where are you?', 'estar'),
    u4.C('Ellos ___ cansados.', 'están', ['son', 'estáis'], 'They are tired.', 'estar'),
    u4.C('Nosotros ___ en el restaurante.', 'estamos', ['somos', 'están'], 'We are in the restaurant.', 'estar'),
    u4.C('Madrid ___ en España.', 'está', ['es', 'son'], 'Madrid is in Spain.', 'ser or estar?', 'Location → estar.'),
    u4.C('Pablo ___ alto.', 'es', ['está', 'son'], 'Pablo is tall.', 'ser or estar?', 'A characteristic → ser.'),
    u4.C('Hoy ___ muy contenta.', 'estoy', ['soy', 'está'], 'Today I am very happy.', 'ser or estar?', 'How you feel right now → estar.'),
  ],
}

// ---------------------------------------------------------------- Unit 5
const u5 = make('u5')
const unit5: Unit = {
  id: 'u5',
  title: 'Regular -ar verbs',
  cefr: 'A1',
  grammar: {
    title: 'Present tense of regular -ar verbs',
    body: [
      'Remove -ar from the infinitive and add the ending for the person. Hablar (to speak):',
      '| yo | hablo',
      '| tú | hablas',
      '| él / ella / usted | habla',
      '| nosotros / nosotras | hablamos',
      '| vosotros / vosotras | habláis',
      '| ellos / ellas / ustedes | hablan',
      'One present tense covers "I speak", "I am speaking" and "I do speak".',
      'To make a sentence negative, put no directly before the verb: "No hablo francés."',
      'Names of languages are lowercase: español, inglés, francés.',
    ],
    examples: [
      { es: 'Hablo español.', en: 'I speak Spanish.' },
      { es: 'No trabajo los domingos.', en: "I don't work on Sundays." },
      { es: '¿Qué estudias?', en: 'What are you studying?' },
      { es: 'Ellos escuchan música.', en: 'They listen to music.' },
    ],
  },
  items: [
    u5.W('hablar', 'to speak / to talk'),
    u5.W('trabajar', 'to work'),
    u5.W('estudiar', 'to study'),
    u5.W('escuchar', 'to listen (to)'),
    u5.W('necesitar', 'to need'),
    u5.W('comprar', 'to buy'),
    u5.W('cocinar', 'to cook'),
    u5.W('llegar', 'to arrive'),
    u5.W('la música', 'music'),
    u5.W('el café', 'coffee'),
    u5.W('el pan', 'bread'),
    u5.S('Hablo español.', 'I speak Spanish.'),
    u5.S('No hablo francés.', "I don't speak French."),
    u5.S('Trabajamos en una oficina.', 'We work in an office.'),
    u5.S('¿Qué estudias?', 'What are you studying?'),
    u5.S('Ella escucha música.', 'She listens to music.'),
    u5.S('Necesito un café.', 'I need a coffee.'),
    u5.S('Ellos compran pan.', 'They buy bread.'),
    u5.C('Yo ___ en Madrid.', 'trabajo', ['trabaja', 'trabajas'], 'I work in Madrid.', 'trabajar'),
    u5.C('Tú ___ inglés.', 'hablas', ['habla', 'hablo'], 'You speak English.', 'hablar'),
    u5.C('Ella ___ la radio.', 'escucha', ['escuchas', 'escuchan'], 'She listens to the radio.', 'escuchar'),
    u5.C('Nosotros ___ español.', 'estudiamos', ['estudian', 'estudiáis'], 'We study Spanish.', 'estudiar'),
    u5.C('Ellos ___ mucho.', 'trabajan', ['trabajamos', 'trabaja'], 'They work a lot.', 'trabajar'),
    u5.C('¿Qué ___ usted?', 'necesita', ['necesitas', 'necesito'], 'What do you need? (formal)', 'necesitar'),
    u5.C('Yo ___ hablo alemán.', 'no', ['ni', 'nada'], "I don't speak German.", 'negation'),
  ],
}

// ---------------------------------------------------------------- Unit 6
const u6 = make('u6')
const unit6: Unit = {
  id: 'u6',
  title: '-er and -ir verbs, question words',
  cefr: 'A1',
  grammar: {
    title: 'Present tense of -er and -ir verbs; asking questions',
    body: [
      'Comer (to eat) and vivir (to live) share most endings. Only the nosotros and vosotros forms differ:',
      '| | comer | vivir',
      '| yo | como | vivo',
      '| tú | comes | vives',
      '| él / ella / usted | come | vive',
      '| nosotros / nosotras | comemos | vivimos',
      '| vosotros / vosotras | coméis | vivís',
      '| ellos / ellas / ustedes | comen | viven',
      'Question words always carry an accent: ¿qué? (what), ¿dónde? (where), ¿cuándo? (when), ¿quién? (who), ¿cómo? (how), ¿por qué? (why).',
      'The answer "because" is porque: one word, no accent.',
    ],
    examples: [
      { es: '¿Dónde vives?', en: 'Where do you live?' },
      { es: 'Vivimos en Sevilla.', en: 'We live in Seville.' },
      { es: '¿Qué comes?', en: 'What are you eating?' },
      { es: '¿Por qué aprendes español? Porque me gusta.', en: 'Why are you learning Spanish? Because I like it.' },
    ],
  },
  items: [
    u6.W('comer', 'to eat'),
    u6.W('beber', 'to drink'),
    u6.W('leer', 'to read'),
    u6.W('aprender', 'to learn'),
    u6.W('vivir', 'to live'),
    u6.W('escribir', 'to write'),
    u6.W('abrir', 'to open'),
    u6.W('¿qué?', 'what?'),
    u6.W('¿dónde?', 'where?'),
    u6.W('¿cuándo?', 'when?'),
    u6.W('¿quién?', 'who?'),
    u6.W('¿por qué?', 'why?'),
    u6.W('porque', 'because'),
    u6.W('el agua', 'water', { note: 'Agua is feminine but takes el in the singular, because it starts with a stressed a-: el agua fría.' }),
    u6.W('la carta', 'the letter (mail)'),
    u6.W('pequeño', 'small', { alts: ['pequeña'] }),
    u6.S('¿Dónde vives?', 'Where do you live? (informal)'),
    u6.S('Vivo en una ciudad pequeña.', 'I live in a small city.'),
    u6.S('Ella lee un libro.', 'She is reading a book.'),
    u6.S('Aprendo español.', 'I am learning Spanish.'),
    u6.S('¿Qué bebes?', 'What are you drinking? (informal)'),
    u6.S('Ellos escriben una carta.', 'They are writing a letter.'),
    u6.C('Yo ___ en Barcelona.', 'vivo', ['vive', 'vives'], 'I live in Barcelona.', 'vivir'),
    u6.C('Tú ___ mucho.', 'lees', ['lee', 'leo'], 'You read a lot.', 'leer'),
    u6.C('Nosotros ___ en casa.', 'comemos', ['comen', 'coméis'], 'We eat at home.', 'comer'),
    u6.C('Nosotros ___ en Madrid.', 'vivimos', ['vivemos', 'viven'], 'We live in Madrid.', 'vivir'),
    u6.C('Ellos ___ agua.', 'beben', ['bebe', 'bebemos'], 'They drink water.', 'beber'),
    u6.C('¿___ vives?', 'Dónde', ['Qué', 'Quién'], 'Where do you live?'),
    u6.C('¿___ es él?', 'Quién', ['Qué', 'Cuándo'], 'Who is he?'),
  ],
}

// ---------------------------------------------------------------- Unit 7
const u7 = make('u7')
const unit7: Unit = {
  id: 'u7',
  title: 'Tener and numbers',
  cefr: 'A1',
  grammar: {
    title: 'Tener (to have): possession, age, "tener que"',
    body: [
      'Tener is irregular:',
      '| yo | tengo',
      '| tú | tienes',
      '| él / ella / usted | tiene',
      '| nosotros / nosotras | tenemos',
      '| vosotros / vosotras | tenéis',
      '| ellos / ellas / ustedes | tienen',
      'Age uses tener, not ser: "Tengo veinte años" (literally "I have twenty years").',
      'Some feelings also use tener: tener hambre (to be hungry), tener sed (to be thirsty).',
      'Tener que + infinitive = to have to: "Tengo que trabajar."',
      'Uno becomes un before a masculine noun: "un libro" (one book / a book), and una before a feminine noun.',
    ],
    examples: [
      { es: 'Tengo un perro.', en: 'I have a dog.' },
      { es: '¿Cuántos años tienes? Tengo veinte años.', en: 'How old are you? I am twenty.' },
      { es: 'Tenemos hambre.', en: 'We are hungry.' },
      { es: 'Tienes que estudiar.', en: 'You have to study.' },
    ],
  },
  items: [
    u7.W('tener', 'to have'),
    u7.W('uno', 'one'),
    u7.W('dos', 'two'),
    u7.W('tres', 'three'),
    u7.W('cuatro', 'four'),
    u7.W('cinco', 'five'),
    u7.W('seis', 'six'),
    u7.W('siete', 'seven'),
    u7.W('ocho', 'eight'),
    u7.W('nueve', 'nine'),
    u7.W('diez', 'ten'),
    u7.W('veinte', 'twenty'),
    u7.W('el año', 'the year'),
    u7.W('el hermano', 'the brother'),
    u7.W('la hermana', 'the sister'),
    u7.P('tener hambre', 'to be hungry'),
    u7.P('tener sed', 'to be thirsty'),
    u7.S('¿Cuántos años tienes?', 'How old are you? (informal)'),
    u7.S('Tengo veinte años.', 'I am twenty years old.'),
    u7.S('Tengo hambre.', 'I am hungry.'),
    u7.S('Tengo dos hermanos.', 'I have two brothers (or siblings).'),
    u7.S('Tenemos que trabajar.', 'We have to work.'),
    u7.S('¿Tienes un perro?', 'Do you have a dog? (informal)'),
    u7.C('Yo ___ un gato.', 'tengo', ['tiene', 'tienes'], 'I have a cat.', 'tener'),
    u7.C('Ella ___ diez años.', 'tiene', ['es', 'tienes'], 'She is ten years old.', 'tener'),
    u7.C('Tú ___ que estudiar.', 'tienes', ['tienen', 'tengo'], 'You have to study.', 'tener'),
    u7.C('Nosotros ___ sed.', 'tenemos', ['estamos', 'tienen'], 'We are thirsty.', 'tener'),
    u7.C('Ellos ___ hambre.', 'tienen', ['tiene', 'están'], 'They are hungry.', 'tener'),
    u7.C('Mi hermana ___ seis años.', 'tiene', ['es', 'está'], 'My sister is six years old.', 'age', 'Age uses tener.'),
    u7.C('Tengo ___ libro.', 'un', ['uno', 'una'], 'I have one book.', 'uno'),
  ],
}

// ---------------------------------------------------------------- Unit 8
const u8 = make('u8')
const unit8: Unit = {
  id: 'u8',
  title: 'Gustar: likes and dislikes',
  cefr: 'A1',
  grammar: {
    title: 'Me gusta: saying what you like',
    body: [
      'Gustar works like "to please": the thing you like is the subject. "Me gusta el café" is literally "coffee pleases me".',
      'Use gusta with one thing or with a verb, and gustan with several things: "Me gusta leer", "Me gustan los perros".',
      'The pronoun in front shows who likes it:',
      '| me gusta | I like',
      '| te gusta | you like',
      '| le gusta | he / she likes, you (formal) like',
      '| nos gusta | we like',
      '| os gusta | you all like (Spain only)',
      '| les gusta | they like, you all like',
      'Keep the article before the noun: "Me gusta el chocolate", not "Me gusta chocolate".',
      'Negative: "No me gusta". To be clear about le / les, add a + person: "A ella le gusta la playa".',
    ],
    examples: [
      { es: 'Me gusta el café.', en: 'I like coffee.' },
      { es: 'Me gustan los gatos.', en: 'I like cats.' },
      { es: '¿Te gusta bailar?', en: 'Do you like dancing?' },
      { es: 'No nos gusta el fútbol.', en: "We don't like football." },
    ],
  },
  items: [
    u8.W('gustar', 'to like (to please)'),
    u8.W('el chocolate', 'chocolate'),
    u8.W('la fruta', 'fruit'),
    u8.W('el té', 'tea', { note: 'With an accent, té is "tea". Without it, te means "you / to you".' }),
    u8.W('la playa', 'the beach'),
    u8.W('el fútbol', 'football / soccer'),
    u8.W('bailar', 'to dance'),
    u8.W('viajar', 'to travel'),
    u8.W('mucho', 'a lot / much'),
    u8.S('Me gusta el café.', 'I like coffee.'),
    u8.S('Me gustan los perros.', 'I like dogs.'),
    u8.S('¿Te gusta bailar?', 'Do you like dancing? (informal)'),
    u8.S('No me gusta el té.', "I don't like tea."),
    u8.S('Nos gusta viajar.', 'We like travelling.'),
    u8.S('A ella le gusta la playa.', 'She likes the beach.', { alts: ['le gusta la playa'] }),
    u8.S('Me gusta mucho la fruta.', 'I really like fruit.'),
    u8.C('Me ___ el chocolate.', 'gusta', ['gustan', 'gusto'], 'I like chocolate.'),
    u8.C('Me ___ los gatos.', 'gustan', ['gusta', 'gusto'], 'I like cats.'),
    u8.C('¿___ gusta viajar?', 'Te', ['Tú', 'Ti'], 'Do you like travelling?'),
    u8.C('___ gusta la música.', 'Nos', ['Nosotros', 'Os'], 'We like music.'),
    u8.C('A ellos ___ gusta el fútbol.', 'les', ['le', 'los'], 'They like football.'),
    u8.C('A mi hermano ___ gusta cocinar.', 'le', ['les', 'lo'], 'My brother likes cooking.'),
  ],
}


// ---------------------------------------------------------------- Unit 9
const u9 = make('u9')
const unit9: Unit = {
  id: 'u9',
  title: 'Querer, poder and other stem-changing verbs',
  cefr: 'A1',
  grammar: {
    title: 'Stem-changing verbs: quiero, puedo, pido',
    body: [
      'Some common verbs change the vowel in their stem when it is stressed. The change happens in every form except nosotros and vosotros. The endings stay regular.',
      '| | querer (e→ie) | poder (o→ue) | pedir (e→i)',
      '| yo | quiero | puedo | pido',
      '| tú | quieres | puedes | pides',
      '| él / ella / usted | quiere | puede | pide',
      '| nosotros / nosotras | queremos | podemos | pedimos',
      '| vosotros / vosotras | queréis | podéis | pedís',
      '| ellos / ellas / ustedes | quieren | pueden | piden',
      'Others: preferir and empezar (e→ie: prefiero, empiezo), dormir (o→ue: duermo), jugar (u→ue: juego).',
      'Querer and poder are often followed by an infinitive: "Quiero comer", "No puedo dormir".',
      'In a café, "Quiero un café, por favor" is normal and polite enough in Spain. "Quería…" (I would like) is softer.',
    ],
    examples: [
      { es: '¿Qué quieres beber?', en: 'What do you want to drink?' },
      { es: 'No puedo dormir.', en: "I can't sleep." },
      { es: 'Prefiero el té.', en: 'I prefer tea.' },
      { es: 'Queremos ir a la playa.', en: 'We want to go to the beach.' },
    ],
  },
  items: [
    u9.W('querer', 'to want / to love'),
    u9.W('poder', 'to be able to / can'),
    u9.W('preferir', 'to prefer'),
    u9.W('pedir', 'to ask for / to order'),
    u9.W('dormir', 'to sleep'),
    u9.W('empezar', 'to start / to begin'),
    u9.W('jugar', 'to play (a game or sport)', { note: 'Jugar changes u→ue: juego, juegas, juega… For music instruments use tocar.' }),
    u9.W('la cerveza', 'the beer'),
    u9.S('Quiero un café, por favor.', 'I want a coffee, please.'),
    u9.S('¿Puedes repetir, por favor?', 'Can you repeat that, please?'),
    u9.S('Prefiero el té.', 'I prefer tea.'),
    u9.S('No puedo dormir.', "I can't sleep."),
    u9.S('¿Qué quieres comer?', 'What do you want to eat?'),
    u9.S('Pido una cerveza.', 'I order a beer.'),
    u9.S('Juego al fútbol.', 'I play football.', { alts: ['juego fútbol'], note: 'Spain says jugar al fútbol; much of Latin America says jugar fútbol.' }),
    u9.C('Yo ___ un café.', 'quiero', ['quero', 'quieres'], 'I want a coffee.', 'querer'),
    u9.C('Nosotros ___ ir a la playa.', 'queremos', ['quieremos', 'quieren'], 'We want to go to the beach.', 'querer', 'No stem change for nosotros.'),
    u9.C('Tú ___ comer aquí.', 'puedes', ['podes', 'puedo'], 'You can eat here.', 'poder'),
    u9.C('Ellos no ___ dormir.', 'pueden', ['poden', 'podemos'], "They can't sleep.", 'poder'),
    u9.C('Ella ___ el té.', 'prefiere', ['prefere', 'prefieres'], 'She prefers tea.', 'preferir'),
    u9.C('Yo ___ agua.', 'pido', ['pide', 'pedimos'], 'I ask for water.', 'pedir'),
    u9.C('Yo ___ ocho horas.', 'duermo', ['dormo', 'duerme'], 'I sleep eight hours.', 'dormir'),
  ],
}

// ---------------------------------------------------------------- Unit 10
const u10 = make('u10')
const unit10: Unit = {
  id: 'u10',
  title: 'Ir, days of the week and the time',
  cefr: 'A1',
  grammar: {
    title: 'Ir (to go), "ir a" + infinitive, days and time',
    body: [
      'Ir is completely irregular:',
      '| yo | voy',
      '| tú | vas',
      '| él / ella / usted | va',
      '| nosotros / nosotras | vamos',
      '| vosotros / vosotras | vais',
      '| ellos / ellas / ustedes | van',
      'Ir a + place. A + el contracts to al: "Voy al cine", but "Voy a la playa".',
      'Ir a + infinitive talks about the near future, like "going to": "Voy a comer." "Vamos a…" can also mean "Let\'s…".',
      'Days are lowercase and masculine: el lunes = on Monday, los lunes = on Mondays. No word for "on".',
      'Time: ¿Qué hora es? Es la una (1:00, singular). Son las dos, son las tres… (plural). "At" a time: a las cinco.',
    ],
    examples: [
      { es: 'Voy al supermercado.', en: "I'm going to the supermarket." },
      { es: 'El sábado vamos a la playa.', en: "On Saturday we're going to the beach." },
      { es: 'Mañana voy a trabajar.', en: "Tomorrow I'm going to work." },
      { es: 'Son las tres. Comemos a las dos.', en: "It's three o'clock. We eat at two." },
    ],
  },
  items: [
    u10.W('ir', 'to go'),
    u10.W('lunes', 'Monday'),
    u10.W('martes', 'Tuesday'),
    u10.W('miércoles', 'Wednesday'),
    u10.W('jueves', 'Thursday'),
    u10.W('viernes', 'Friday'),
    u10.W('sábado', 'Saturday'),
    u10.W('domingo', 'Sunday'),
    u10.W('hoy', 'today'),
    u10.W('mañana', 'tomorrow', { note: 'La mañana also means "the morning".' }),
    u10.W('la semana', 'the week'),
    u10.P('el fin de semana', 'the weekend'),
    u10.W('la hora', 'the hour / the time'),
    u10.W('once', 'eleven'),
    u10.W('doce', 'twelve'),
    u10.W('el cine', 'the cinema'),
    u10.W('el supermercado', 'the supermarket'),
    u10.S('Voy al cine.', "I'm going to the cinema."),
    u10.S('¿Adónde vas?', 'Where are you going?', { alts: ['a dónde vas'] }),
    u10.S('Vamos a comer.', "We're going to eat. / Let's eat."),
    u10.S('Mañana voy a trabajar.', "Tomorrow I'm going to work.", { alts: ['voy a trabajar mañana'] }),
    u10.S('El sábado vamos a la playa.', "On Saturday we're going to the beach."),
    u10.S('¿Qué hora es?', 'What time is it?'),
    u10.S('Son las tres.', "It's three o'clock."),
    u10.S('Es la una.', "It's one o'clock."),
    u10.C('Yo ___ al supermercado.', 'voy', ['vo', 'va'], "I'm going to the supermarket.", 'ir'),
    u10.C('¿Tú ___ al cine?', 'vas', ['va', 'vais'], 'Are you going to the cinema?', 'ir'),
    u10.C('Nosotros ___ a la playa.', 'vamos', ['vais', 'van'], "We're going to the beach.", 'ir'),
    u10.C('Ellos ___ a trabajar mañana.', 'van', ['va', 'vamos'], 'They are going to work tomorrow.', 'ir'),
    u10.C('Voy ___ cine.', 'al', ['a el', 'el'], "I'm going to the cinema.", undefined, 'A + el = al.'),
    u10.C('Ella va ___ estudiar.', 'a', ['de', 'en'], 'She is going to study.', 'ir ___ + infinitive'),
    u10.C('Son ___ cuatro.', 'las', ['la', 'los'], "It's four o'clock."),
    u10.C('Es ___ una.', 'la', ['las', 'el'], "It's one o'clock."),
  ],
}

// ---------------------------------------------------------------- Unit 11
const u11 = make('u11')
const unit11: Unit = {
  id: 'u11',
  title: 'Family, home, "my/your" and hay',
  cefr: 'A1',
  grammar: {
    title: 'Possessives (mi, tu, su, nuestro) and hay',
    body: [
      'Possessives agree with the thing owned, not the owner:',
      '| my | mi | mis (plural)',
      '| your (tú) | tu | tus',
      '| his / her / its / your (usted) / their | su | sus',
      '| our | nuestro / nuestra | nuestros / nuestras',
      '| your (vosotros, Spain) | vuestro / vuestra | vuestros / vuestras',
      '"Mis padres" = my parents (plural thing owned). "Nuestra casa" = our house (casa is feminine).',
      'Tu (your) has no accent; tú (you) does: "¿Tú vives con tu madre?"',
      'Hay = there is / there are. It never changes: "Hay un baño", "Hay dos baños". Use un/una or a number, or nothing for plurals: "Hay restaurantes". "No hay pan" = there is no bread.',
    ],
    examples: [
      { es: 'Mi madre se llama Carmen.', en: "My mother's name is Carmen." },
      { es: 'Mis hermanos viven en Madrid.', en: 'My brothers live in Madrid.' },
      { es: 'En nuestra casa hay dos baños.', en: 'In our house there are two bathrooms.' },
      { es: '¿Hay un supermercado aquí?', en: 'Is there a supermarket here?' },
    ],
  },
  items: [
    u11.W('la familia', 'the family'),
    u11.W('el padre', 'the father'),
    u11.W('la madre', 'the mother'),
    u11.W('los padres', 'the parents', { note: 'Los padres means "parents" (or "fathers").' }),
    u11.W('el hijo', 'the son'),
    u11.W('la hija', 'the daughter'),
    u11.W('los hijos', 'the children (sons and daughters)'),
    u11.W('el abuelo', 'the grandfather'),
    u11.W('la abuela', 'the grandmother'),
    u11.W('el marido', 'the husband', { alts: ['el esposo'] }),
    u11.W('la esposa', 'the wife', { alts: ['la mujer'], note: 'In Spain "mi mujer" (my wife) is very common too.' }),
    u11.W('el baño', 'the bathroom'),
    u11.W('la cocina', 'the kitchen'),
    u11.W('el dormitorio', 'the bedroom', { alts: ['la habitación'] }),
    u11.W('hay', 'there is / there are'),
    u11.S('Mi madre se llama Carmen.', "My mother's name is Carmen."),
    u11.S('¿Cómo se llama tu padre?', "What's your father's name?"),
    u11.S('Tengo dos hijos.', 'I have two children.'),
    u11.S('Hay un baño.', 'There is one bathroom.'),
    u11.S('No hay pan.', "There's no bread."),
    u11.S('¿Hay un restaurante aquí?', 'Is there a restaurant here?'),
    u11.S('Nuestra casa es pequeña.', 'Our house is small.'),
    u11.S('Sus padres viven en Sevilla.', 'His (or her, their) parents live in Seville.'),
    u11.C('___ hermana es médica.', 'Mi', ['Mis', 'Me'], 'My sister is a doctor.', 'my'),
    u11.C('___ padres son simpáticos.', 'Mis', ['Mi', 'Me'], 'My parents are nice.', 'my'),
    u11.C('¿Dónde está ___ casa?', 'tu', ['tú', 'tus'], 'Where is your house?', 'your (tú)', 'Your = tu, no accent. Tú (with accent) = you.'),
    u11.C('___ casa es pequeña.', 'Nuestra', ['Nuestro', 'Nuestras'], 'Our house is small.', 'our'),
    u11.C('Ana y ___ marido viven aquí.', 'su', ['sus', 'tu'], 'Ana and her husband live here.', 'her'),
    u11.C('En mi casa ___ dos baños.', 'hay', ['son', 'están'], 'In my house there are two bathrooms.'),
    u11.C('No ___ agua.', 'hay', ['es', 'está'], "There's no water."),
  ],
}

// ---------------------------------------------------------------- Unit 12
const u12 = make('u12')
const unit12: Unit = {
  id: 'u12',
  title: 'Daily routine and reflexive verbs',
  cefr: 'A1',
  grammar: {
    title: 'Reflexive verbs: me levanto, te duchas',
    body: [
      'Reflexive verbs (dictionary form ends in -se) describe things you do to yourself. They take a pronoun before the verb. You already know one: llamarse (me llamo).',
      '| yo | me levanto',
      '| tú | te levantas',
      '| él / ella / usted | se levanta',
      '| nosotros / nosotras | nos levantamos',
      '| vosotros / vosotras | os levantáis',
      '| ellos / ellas / ustedes | se levantan',
      'Some are also stem-changing: acostarse (me acuesto), despertarse (me despierto).',
      'Parts of the day: por la mañana (in the morning), por la tarde (in the afternoon / evening), por la noche (at night).',
      'Frequency words usually go before the verb (and before the pronoun): "Siempre me ducho por la mañana." "Nunca ceno tarde."',
    ],
    examples: [
      { es: 'Me levanto a las siete.', en: 'I get up at seven.' },
      { es: '¿A qué hora te acuestas?', en: 'What time do you go to bed?' },
      { es: 'Nunca desayuno.', en: 'I never have breakfast.' },
      { es: 'Por la noche leo un libro.', en: 'At night I read a book.' },
    ],
  },
  items: [
    u12.W('levantarse', 'to get up'),
    u12.W('ducharse', 'to shower'),
    u12.W('despertarse', 'to wake up', { note: 'e→ie: me despierto.' }),
    u12.W('acostarse', 'to go to bed', { note: 'o→ue: me acuesto.' }),
    u12.W('desayunar', 'to have breakfast'),
    u12.W('cenar', 'to have dinner'),
    u12.P('por la mañana', 'in the morning'),
    u12.P('por la noche', 'at night / in the evening'),
    u12.W('siempre', 'always'),
    u12.W('nunca', 'never'),
    u12.P('a veces', 'sometimes'),
    u12.W('temprano', 'early'),
    u12.W('tarde', 'late', { note: 'La tarde = the afternoon. Tarde (no article) = late.' }),
    u12.S('Me levanto a las siete.', 'I get up at seven.'),
    u12.S('Me ducho por la mañana.', 'I shower in the morning.'),
    u12.S('¿A qué hora te acuestas?', 'What time do you go to bed?'),
    u12.S('Nos levantamos temprano.', 'We get up early.'),
    u12.S('Siempre desayuno un café.', 'I always have a coffee for breakfast.'),
    u12.S('Nunca ceno tarde.', 'I never have dinner late.'),
    u12.S('Ella se despierta a las seis.', 'She wakes up at six.'),
    u12.C('Yo ___ levanto a las ocho.', 'me', ['se', 'te'], 'I get up at eight.'),
    u12.C('¿A qué hora ___ duchas?', 'te', ['se', 'me'], 'What time do you shower?'),
    u12.C('Ella ___ levanta tarde.', 'se', ['le', 'me'], 'She gets up late.'),
    u12.C('Nosotros ___ acostamos a las once.', 'nos', ['os', 'se'], 'We go to bed at eleven.'),
    u12.C('Yo me ___ a las doce.', 'acuesto', ['acosto', 'acuesta'], 'I go to bed at twelve.', 'acostarse'),
    u12.C('Ellos se ___ temprano.', 'despiertan', ['despertan', 'despierta'], 'They wake up early.', 'despertarse'),
    u12.C('___ como a las dos.', 'Siempre', ['Nunca', 'Tarde'], 'I always eat at two.', 'always'),
  ],
}

export const UNITS: Unit[] = [unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10, unit11, unit12]

export const ITEMS: Item[] = UNITS.flatMap((u) => u.items)

export const ITEM_BY_ID: Map<string, Item> = new Map(ITEMS.map((i) => [i.id, i]))

export const UNIT_OF_ITEM: Map<string, Unit> = new Map(
  UNITS.flatMap((u) => u.items.map((i) => [i.id, u] as const)),
)
