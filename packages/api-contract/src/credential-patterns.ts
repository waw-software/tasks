// No TypeBox import: native clients bundle this file.
export const DEVICE_TOKEN_PATTERN = "^waw_dev_[A-Za-z0-9_-]{43}$";
export const PAIRING_TOKEN_PATTERN = "^waw_pair_[A-Za-z0-9_-]{43}$";
// The pattern excludes the urn:uuid: form that the uuid format also accepts.
export const DEVICE_TOKEN_ID_PATTERN =
	"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
