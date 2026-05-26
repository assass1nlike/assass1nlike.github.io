对 NOP 问题 $$\min_{x,y} f(xy^\top) $$，当用学习率 $$\eta \to 0 $$ 的 SGD（即梯度流）训练时，$$\|x_t\|^2 - \|y_t\|^2 = \|x_0\|^2 - \|y_0\|^2 $$ 对所有 $$t > 0 $$ 成立，即 $$dB_t/dt = 0 $$。

证明的核心思路非常优雅，只需要链式法则和梯度的结构性质。

#### 第一步：写出梯度流方程

梯度流（$$\eta \to 0 $$ 的连续时间极限）下，$$x $$ 和 $$y $$ 的演化为：
$$
\frac{dx}{dt} = -g_x = -\nabla f(xy^\top) \cdot y
$$
这里的关键观察是梯度的**交叉结构**：$$x $$ 的梯度包含 $$y $$，$$y $$ 的梯度包含 $$x $$。这是外积参数化 $$W = xy^\top $$ 的链式法则的直接结果。

#### 第二步：计算 $$\|x_t\|^2 $$ 和 $$\|y_t\|^2 $$ 的时间导数

$$
\frac{d}{dt}\|x\|^2 = 2x^\top \frac{dx}{dt} = -2x^\top \nabla f(xy^\top) y
$$

#### 第三步：观察两者相等

注意 $$x^\top \nabla f(xy^\top) y $$ 是一个标量。而 $$y^\top [\nabla f(xy^\top)]^\top x = [x^\top \nabla f(xy^\top) y]^\top $$。由于标量的转置是它自身，所以：
$$
x^\top \nabla f(xy^\top) y = y^\top [\nabla f(xy^\top)]^\top x
$$
因此：
$$
\frac{d}{dt}\|x\|^2 = \frac{d}{dt}\|y\|^2
$$

#### 第四步：得出守恒律

$$
\frac{dB_t}{dt} = \frac{1}{2}\frac{d}{dt}(\|x\|^2 - \|y\|^2) = \frac{1}{2}\left(\frac{d}{dt}\|x\|^2 - \frac{d}{dt}\|y\|^2\right) = 0
$$

因此 $$B_t = B_0 $$ 对所有 $$t $$ 成立。$$\square $$

#### 为什么需要 $$\eta \to 0 $$：离散情形的守恒律破缺

上述证明在梯度流（连续时间 ODE）框架下精确成立，看似没有显式用到 $$\eta \to 0 $$。但关键在于：**梯度流本身就是 $$\eta \to 0 $$ 的产物**。实际的离散 SGD 更新为：

$$
x_{t+1} = x_t - \eta g_{x_t}, \quad y_{t+1} = y_t - \eta g_{y_t}
$$

在离散情形下，展开 $$\|x_{t+1}\|^2 $$ 和 $$\|y_{t+1}\|^2 $$：

$$
\|x_{t+1}\|^2 = \|x_t - \eta g_{x_t}\|^2 = \|x_t\|^2 - 2\eta x_t^\top g_{x_t} + \eta^2 \|g_{x_t}\|^2
$$

$$
\|y_{t+1}\|^2 = \|y_t - \eta g_{y_t}\|^2 = \|y_t\|^2 - 2\eta y_t^\top g_{y_t} + \eta^2 \|g_{y_t}\|^2
$$

两者相减，得到平衡性的单步变化：

$$
B_{t+1} - B_t = \underbrace{-\eta(x_t^\top g_{x_t} - y_t^\top g_{y_t})}_{= 0 \text{（交叉结构）}} + \frac{\eta^2}{2}(\|g_{x_t}\|^2 - \|g_{y_t}\|^2)
$$

第一项（$$O(\eta) $$ 阶）由前面证明的交叉结构保证为零。但第二项（$$O(\eta^2) $$ 阶）**一般不为零**——$$x $$ 和 $$y $$ 的梯度范数没有理由相等。

因此，离散 SGD 下守恒律的偏移为：

$$
B_{t+1} - B_t = \frac{\eta^2}{2}(\|g_{x_t}\|^2 - \|g_{y_t}\|^2)
$$

只有当 $$\eta \to 0 $$ 时，这个二阶残差项才消失，守恒律才精确成立。

**这一结果也恰好呼应了 BAR 论文中的核心对比**：

- **SGD**：平衡性的破缺项为 $$O(\eta^2) $$，在连续极限下消失，守恒律成立。
- **SAM**：由于扰动步引入了半径为 $$\rho $$ 的对抗扰动，平衡性的变化中出现了 $$O(\rho) $$ 的**一阶项**（定理2），这一项独立于 $$\eta $$，即使 $$\eta \to 0 $$ 也不消失。这就是 SAM 能主动促进平衡性而 SGD 不能的根本原因。

近期的工作（如 "Conservation Law Breaking at the Edge of Stability"）也正式刻画了多层网络中的离散漂移项：$$\Delta C_l(t) = \eta^2[\|\partial \mathcal{L}/\partial W_{l+1}\|_F^2 - \|\partial \mathcal{L}/\partial W_l\|_F^2] $$，与上述推导完全一致。这说明在实际有限学习率训练中，守恒律会被系统性地打破，打破的方向恰好与 SAM 类似——梯度范数更大的那一侧会增长得更快。

#### 更一般的矩阵情形

当 $$x \in \mathbb{R}^{d_1 \times r} $$, $$y \in \mathbb{R}^{d_2 \times r} $$ 时（即 $$W = XY^\top $$），证明完全类似。梯度为：
$$
\frac{dX}{dt} = -\nabla f(XY^\top) Y, \quad \frac{dY}{dt} = -[\nabla f(XY^\top)]^\top X
$$
计算 Frobenius 范数的变化率：
$$
\frac{d}{dt}\|X\|_F^2 = 2\text{tr}(X^\top \dot{X}) = -2\text{tr}(X^\top \nabla f(XY^\top) Y)
$$
利用迹的循环性质 $$\text{tr}(A^\top B C) = \text{tr}(C A^\top B) $$，可以验证两者相等，守恒律依然成立。

#### 深层网络的推广

Du et al. (2018) 将此推广到了 $N $ 层深度线性网络 $$W = W^{(N)} W^{(N-1)} \cdots W^{(1)} $$，证明了对相邻层 $$l $$ 和 $$l+1 $$，$$\|W^{(l+1)}\|_F^2 - \|W^{(l)}\|_F^2 $$ 在梯度流下也是守恒量。证明的核心思路相同——链式法则导致相邻层的梯度中包含对方的参数，产生一种"对称性"使得范数变化率相等。