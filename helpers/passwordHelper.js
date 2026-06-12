import bcrypt from 'bcrypt';

const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, 10);
}

const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

export { hashPassword, comparePassword };


