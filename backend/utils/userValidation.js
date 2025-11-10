import DepartmentHead from '../DepartmentHead.js';
import Teacher from '../Teacher.js';
import Student from '../Student.js';

/**
 * Check if an email is already taken by any user type
 * @param {string} email - Email to check
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @returns {Promise<Object|null>} - Object with user type and user data if found, null otherwise
 */
export const checkEmailExists = async (email, excludeId = null) => {
  // Check in DepartmentHead
  let user = await DepartmentHead.findOne({ 
    email: email.toLowerCase(),
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'department-head', user };
  }

  // Check in Teacher (using phoneNumber field)
  user = await Teacher.findOne({ 
    email: email.toLowerCase(),
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'teacher', user };
  }

  // Check in Student
  user = await Student.findOne({ 
    email: email.toLowerCase(),
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'student', user };
  }

  return null;
};

/**
 * Check if a phone number is already taken by any user type
 * @param {string} phoneNo - Phone number to check
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @returns {Promise<Object|null>} - Object with user type and user data if found, null otherwise
 */
export const checkPhoneExists = async (phoneNo, excludeId = null) => {
  // Check in DepartmentHead (using phoneNo field)
  let user = await DepartmentHead.findOne({ 
    phoneNo,
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'department-head', user };
  }

  // Check in Teacher (using phoneNumber field)
  user = await Teacher.findOne({ 
    phoneNumber: phoneNo,
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'teacher', user };
  }

  // Check in Student (using phoneNo field)
  user = await Student.findOne({ 
    phoneNo,
    ...(excludeId && { _id: { $ne: excludeId } })
  });
  if (user) {
    return { userType: 'student', user };
  }

  return null;
};

/**
 * Get user type display name
 * @param {string} userType - Internal user type
 * @returns {string} - Display name
 */
export const getUserTypeDisplayName = (userType) => {
  switch (userType) {
    case 'department-head':
      return 'Department Head';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    default:
      return 'User';
  }
};