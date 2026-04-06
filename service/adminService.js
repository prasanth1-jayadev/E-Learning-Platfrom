const User = require('../models/User');
const {comparePassword} = require('../helpers/passwordHelper');


const loginAdmin = async(email, password) => {
    const admin = await User.findOne({email});
    
    if(!admin) {
        throw new Error('Invalid credentials - user not found');
    }
    const match = await comparePassword(password.trim(), admin.password);
    
    if(!match) {
        throw new Error('Invalid credentials - wrong password');
    }

    if (admin.role !== 'admin') {
        throw new Error('Not authorized as admin - user role is: ' + admin.role);
    }

    return admin;
}

module.exports={loginAdmin};
