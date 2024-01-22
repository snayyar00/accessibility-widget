// VisitorModel.js
import mongoose from '../utils/connectMongo';

const visitorSchema = new mongoose.Schema({
  Businessname: String,
  Email: String,
  Website: String,
  Uniquetoken: String,
});

const Visitor = mongoose.model('Visitor', visitorSchema);

export default Visitor;
