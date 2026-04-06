const generateOTP =()  =>{
    return String(Math.floor(1000 + Math.random() * 9000));

}

const otpExpiry = ()=>{
    return new Date(Date.now() + 10 *60 *1000);
};

module.exports = {generateOTP , otpExpiry};
