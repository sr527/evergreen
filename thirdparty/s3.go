package thirdparty

import (
	"crypto/hmac"
	"crypto/sha1"
	"crypto/tls"
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"github.com/goamz/goamz/aws"
	"github.com/goamz/goamz/s3"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"sort"
	"strings"
	"time"
)

var s3ParamsToSign = map[string]bool{
	"acl":                          true,
	"location":                     true,
	"logging":                      true,
	"notification":                 true,
	"partNumber":                   true,
	"policy":                       true,
	"requestPayment":               true,
	"torrent":                      true,
	"uploadId":                     true,
	"uploads":                      true,
	"versionId":                    true,
	"versioning":                   true,
	"versions":                     true,
	"response-content-type":        true,
	"response-content-language":    true,
	"response-expires":             true,
	"response-cache-control":       true,
	"response-content-disposition": true,
	"response-content-encoding":    true,
}

// For our S3 copy operations, S3 either returns an CopyObjectResult or
// a CopyObjectError body. In order to determine what kind of response
// was returned we read the body returned from the API call
type CopyObjectResult struct {
	XMLName      xml.Name `xml:"CopyObjectResult"`
	LastModified string   `xml:"LastModified"`
	ETag         string   `xml:"ETag"`
}

type CopyObjectError struct {
	XMLName   xml.Name `xml:"Error"`
	Code      string   `xml:"Code"`
	Message   string   `xml:"Message"`
	Resource  string   `xml:"Resource"`
	RequestId string   `xml:"RequestId"`
	ErrMsg    string
}

func (e CopyObjectError) Error() string {
	return fmt.Sprintf("Code: %v\nMessage: %v\nResource: %v"+
		"\nRequestId: %v\nErrMsg: %v\n",
		e.Code, e.Message, e.Resource, e.RequestId, e.ErrMsg)
}

//This is used to get the bucket and filename,
//ignoring any username/password so that it can be
//securely printed in logs
//Returns: (bucket, filename, error)
func GetS3Location(s3URL string) (string, string, error) {
	urlParsed, err := url.Parse(s3URL)
	if err != nil {
		return "", "", err
	}

	if urlParsed.Scheme != "s3" {
		return "", "", fmt.Errorf("Don't know how to use URL with scheme %v", urlParsed.Scheme)
	}

	return urlParsed.Host, urlParsed.Path, nil
}

func CopyS3File(awsAuth *aws.Auth, fromS3URL string, toS3URL string, permissionACL string) error {
	fromParsed, err := url.Parse(fromS3URL)
	if err != nil {
		return err
	}

	toParsed, err := url.Parse(toS3URL)
	if err != nil {
		return err
	}

	client := &http.Client{}
	destinationPath := fmt.Sprintf("http://%v.s3.amazonaws.com%v", toParsed.Host, toParsed.Path)
	req, err := http.NewRequest("PUT", destinationPath, nil)
	if err != nil {
		return fmt.Errorf("PUT request on %v failed: %v", destinationPath, err)
	}
	req.Header.Add("x-amz-copy-source", fmt.Sprintf("/%v%v", fromParsed.Host, fromParsed.Path))
	req.Header.Add("x-amz-date", time.Now().Format(time.RFC850))
	if permissionACL != "" {
		req.Header.Add("x-amz-acl", permissionACL)
	}
	SignAWSRequest(*awsAuth, "/"+toParsed.Host+toParsed.Path, req)

	resp, err := client.Do(req)
	if resp == nil {
		return fmt.Errorf("Nil response received: %v", err)
	}
	defer resp.Body.Close()

	// attempt to read the response body to check for success/error message
	respBody, respBodyErr := ioutil.ReadAll(resp.Body)
	if respBodyErr != nil {
		return fmt.Errorf("Error reading s3 copy response body: %v", respBodyErr)
	}

	// Attempt to unmarshall the response body. If there's no errors, it means
	// that the S3 copy was successful. If there's an error, or a non-200
	// response code, it indicates a copy error
	copyObjectResult := CopyObjectResult{}
	xmlErr := xml.Unmarshal(respBody, &copyObjectResult)
	if xmlErr != nil || resp.StatusCode != http.StatusOK {
		errMsg := ""
		if xmlErr == nil {
			errMsg = fmt.Sprintf("S3 returned status code: %d", resp.StatusCode)
		} else {
			errMsg = fmt.Sprintf("unmarshalling error: %v", xmlErr)
		}
		// an unmarshalling error or a non-200 status code indicates S3 returned
		// an error so we'll now attempt to unmarshall that error response
		copyObjectError := CopyObjectError{}
		xmlErr = xml.Unmarshal(respBody, &copyObjectError)
		if xmlErr != nil {
			// *This should seldom happen since a non-200 status code or a
			// copyObjectResult unmarshall error on a response from S3 should
			// contain a CopyObjectError. An error here indicates possible
			// backwards incompatible changes in the AWS API
			return fmt.Errorf("Unrecognized S3 response: %v: %v", errMsg, xmlErr)
		}
		copyObjectError.ErrMsg = errMsg
		// if we were able to parse out an error reponse, then we can reliably
		// inform the user of the error
		return copyObjectError
	}
	return err
}

func S3CopyFile(awsAuth *aws.Auth, fromS3Bucket, fromS3Path,
	toS3Bucket, toS3Path, permissionACL string) error {
	client := &http.Client{}
	destinationPath := fmt.Sprintf("http://%v.s3.amazonaws.com/%v",
		toS3Bucket, toS3Path)
	req, err := http.NewRequest("PUT", destinationPath, nil)
	if err != nil {
		return fmt.Errorf("PUT request on %v failed: %v", destinationPath, err)
	}
	req.Header.Add("x-amz-copy-source", fmt.Sprintf("/%v/%v", fromS3Bucket,
		fromS3Path))
	req.Header.Add("x-amz-date", time.Now().Format(time.RFC850))
	if permissionACL != "" {
		req.Header.Add("x-amz-acl", permissionACL)
	}
	signaturePath := fmt.Sprintf("/%v/%v", toS3Bucket, toS3Path)
	SignAWSRequest(*awsAuth, signaturePath, req)

	resp, err := client.Do(req)
	if resp == nil {
		return fmt.Errorf("Nil response received: %v", err)
	}
	defer resp.Body.Close()

	// attempt to read the response body to check for success/error message
	respBody, respBodyErr := ioutil.ReadAll(resp.Body)
	if respBodyErr != nil {
		return fmt.Errorf("Error reading s3 copy response body: %v", respBodyErr)
	}

	// Attempt to unmarshall the response body. If there's no errors, it means
	// that the S3 copy was successful. If there's an error, or a non-200
	// response code, it indicates a copy error
	copyObjectResult := CopyObjectResult{}
	xmlErr := xml.Unmarshal(respBody, &copyObjectResult)
	if xmlErr != nil || resp.StatusCode != http.StatusOK {
		errMsg := ""
		if xmlErr == nil {
			errMsg = fmt.Sprintf("S3 returned status code: %d", resp.StatusCode)
		} else {
			errMsg = fmt.Sprintf("unmarshalling error: %v", xmlErr)
		}
		// an unmarshalling error or a non-200 status code indicates S3 returned
		// an error so we'll now attempt to unmarshall that error response
		copyObjectError := CopyObjectError{}
		xmlErr = xml.Unmarshal(respBody, &copyObjectError)
		if xmlErr != nil {
			// *This should seldom happen since a non-200 status code or a
			// copyObjectResult unmarshall error on a response from S3 should
			// contain a CopyObjectError. An error here indicates possible
			// backwards incompatible changes in the AWS API
			return fmt.Errorf("Unrecognized S3 response: %v: %v", errMsg, xmlErr)
		}
		copyObjectError.ErrMsg = errMsg
		// if we were able to parse out an error reponse, then we can reliably
		// inform the user of the error
		return copyObjectError
	}
	return err
}

func PutS3File(pushAuth *aws.Auth, localFilePath, s3URL, contentType string) error {
	urlParsed, err := url.Parse(s3URL)
	if err != nil {
		return err
	}

	if urlParsed.Scheme != "s3" {
		return fmt.Errorf("Don't know how to use URL with scheme %v", urlParsed.Scheme)
	}

	localFileReader, err := os.Open(localFilePath)
	if err != nil {
		return err
	}

	fi, err := os.Stat(localFilePath)
	if err != nil {
		return err
	}

	session := NewS3Session(pushAuth, aws.USEast)
	if err != nil {
		return err
	}
	bucket := session.Bucket(urlParsed.Host)
	// options for the header
	options := s3.Options{}
	err = bucket.PutReader(urlParsed.Path, localFileReader, fi.Size(), contentType, s3.PublicRead, options)
	if err != nil {
		return err
	}
	return nil
}

func GetS3File(auth *aws.Auth, s3URL string) (io.ReadCloser, error) {
	urlParsed, err := url.Parse(s3URL)
	if err != nil {
		return nil, err
	}
	session := s3.New(*auth, aws.USEast)
	bucket := session.Bucket(urlParsed.Host)
	return bucket.GetReader(urlParsed.Path)
}

//Taken from https://github.com/mitchellh/goamz/blob/master/s3/sign.go
//Modified to access the headers/params on an HTTP req directly.
func SignAWSRequest(auth aws.Auth, canonicalPath string, req *http.Request) {
	method := req.Method
	headers := req.Header
	params := req.URL.Query()

	var md5, ctype, date, xamz string
	var xamzDate bool
	var sarray []string
	for k, v := range headers {
		k = strings.ToLower(k)
		switch k {
		case "content-md5":
			md5 = v[0]
		case "content-type":
			ctype = v[0]
		case "date":
			if !xamzDate {
				date = v[0]
			}
		default:
			if strings.HasPrefix(k, "x-amz-") {
				vall := strings.Join(v, ",")
				sarray = append(sarray, k+":"+vall)
				if k == "x-amz-date" {
					xamzDate = true
					date = ""
				}
			}
		}
	}
	if len(sarray) > 0 {
		sort.StringSlice(sarray).Sort()
		xamz = strings.Join(sarray, "\n") + "\n"
	}

	expires := false
	if v, ok := params["Expires"]; ok {
		// Query string request authentication alternative.
		expires = true
		date = v[0]
		params["AWSAccessKeyId"] = []string{auth.AccessKey}
	}

	sarray = sarray[0:0]
	for k, v := range params {
		if s3ParamsToSign[k] {
			for _, vi := range v {
				if vi == "" {
					sarray = append(sarray, k)
				} else {
					// "When signing you do not encode these values."
					sarray = append(sarray, k+"="+vi)
				}
			}
		}
	}
	if len(sarray) > 0 {
		sort.StringSlice(sarray).Sort()
		canonicalPath = canonicalPath + "?" + strings.Join(sarray, "&")
	}

	payload := method + "\n" + md5 + "\n" + ctype + "\n" + date + "\n" + xamz + canonicalPath
	hash := hmac.New(sha1.New, []byte(auth.SecretKey))
	hash.Write([]byte(payload))
	signature := make([]byte, base64.StdEncoding.EncodedLen(hash.Size()))
	base64.StdEncoding.Encode(signature, hash.Sum(nil))

	if expires {
		params["Signature"] = []string{string(signature)}
	} else {
		headers["Authorization"] = []string{"AWS " + auth.AccessKey + ":" + string(signature)}
	}
}

// NewS3Session checks the OS of the agent if darwin, adds InsecureSkipVerify to the TLSConfig
func NewS3Session(auth *aws.Auth, region aws.Region) *s3.S3 {
	if runtime.GOOS == "darwin" {
		// create a Transport which inlcudes our TLS config
		tlsConfig := tls.Config{InsecureSkipVerify: true}
		tr := http.Transport{TLSClientConfig: &tlsConfig}
		// add the Transport to our http client
		client := &http.Client{Transport: &tr}
		return s3.New(*auth, aws.USEast, client)
	}
	return s3.New(*auth, aws.USEast)

}
