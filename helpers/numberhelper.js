function getnumberfromstring(inputString) {
   return inputString.replace(/\D/g, "")
}
module.exports = {
    getnumberfromstring
};