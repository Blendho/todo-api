const bcrypt = require('bcrypt');

async function testPassword() {
    const plainPassword = 'mypassword123';
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log('Stored hash:', hashedPassword);

    const correctAttempt = await bcrypt.compare('mypassword123', hashedPassword);
    const wrongAttempt = await bcrypt.compare('wrongpassword', hashedPassword);

    console.log('Correct password match?', correctAttempt);
    console.log('Wrong password match?', wrongAttempt);
}

testPassword();