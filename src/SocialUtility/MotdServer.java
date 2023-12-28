import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.Enumeration;
import java.util.TimeZone;

public class MotdServer {
  public static void main(String[] args) {
    try {
      // IPアドレスの取得
      InetAddress ipAddress = null;
      try {
        ipAddress = InetAddress.getLocalHost();
      } catch (UnknownHostException e) {
        try {
          ipAddress = InetAddress.getByName("localhost");
        } catch (UnknownHostException ex) {
          ex.printStackTrace();
          return; // この場合、さらなる処理を中断します。
        }
      }
      System.out.println("IPアドレス: " + ipAddress.getHostAddress());
      // 所在地の取得
      System.out.println("所在地: " + ipAddress.getHostName());
      // タイムゾーンの取得
      TimeZone timeZone = TimeZone.getDefault();
      System.out.println("タイムゾーン: " + timeZone.getDisplayName());
      // 現在の時間の取得
      System.out.println("現在の時間: " + new java.util.Date());
      // Javaのバージョンの取得
      System.out.println("Javaのバージョン: " + System.getProperty("java.version"));
      // ネットワークインターフェースのMACアドレスを列挙
      System.out.println("インターフェースとMACアドレスのリスト:");
      Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
      while (networkInterfaces.hasMoreElements()) {
        NetworkInterface ni = networkInterfaces.nextElement();
        byte[] mac = ni.getHardwareAddress();
        if (mac != null) {
          StringBuilder macAddress = new StringBuilder();
          for (int i = 0; i < mac.length; i++) {
            macAddress.append(String.format("%02X%s", mac[i], (i < mac.length - 1) ? "-" : ""));
          }
          System.out.println(ni.getDisplayName() + ": " + macAddress.toString());
        }
      }
    } catch (SocketException e) {
      e.printStackTrace();
    }
  }
}
